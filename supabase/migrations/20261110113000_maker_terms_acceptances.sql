-- Registro de aceptación de condiciones de makers.
-- Aplicar ANTES de desplegar maker-details con la validación de términos.
-- La versión 2026-11-10-v1 corresponde al borrador de la rama legal:
-- REVISAR Y CERRAR LOS TEXTOS LEGALES antes de desplegar en producción.

alter table public.maker_applications
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz;

comment on column public.maker_applications.terms_version is
  'Última versión de condiciones aceptada durante el formulario de equipo.';
comment on column public.maker_applications.terms_accepted_at is
  'Fecha de aceptación establecida por la base de datos, no por el cliente.';

create table if not exists public.maker_terms_acceptances (
  id bigint generated always as identity primary key,
  maker_application_id uuid not null references public.maker_applications(id) on delete restrict,
  terms_version text not null,
  -- Git blob SHA del documento exacto, preservado en el repositorio.
  terms_git_blob_sha text not null,
  accepted_at timestamptz not null,
  acceptance_source text not null default 'maker/equipo',
  created_at timestamptz not null default now(),
  constraint maker_terms_acceptances_unique_version unique (maker_application_id, terms_version),
  constraint maker_terms_acceptances_source_check check (acceptance_source = 'maker/equipo')
);

create index if not exists maker_terms_acceptances_application_idx
  on public.maker_terms_acceptances (maker_application_id, accepted_at desc);

-- Sin acceso directo desde las claves públicas. Solo uso interno del servidor.
alter table public.maker_terms_acceptances enable row level security;
revoke all on public.maker_terms_acceptances from anon, authenticated;
revoke all on sequence public.maker_terms_acceptances_id_seq from anon, authenticated;

-- El historial nunca debe modificarse desde la aplicación.
create or replace function public.record_maker_terms_acceptance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_git_blob_sha text;
begin
  if new.terms_version is null then
    if tg_op = 'UPDATE' and old.terms_version is not null then
      raise exception 'No se puede retirar una aceptación registrada';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.terms_version is not distinct from old.terms_version then
    -- No cambiar la fecha cuando vuelve a enviarse la misma versión.
    new.terms_accepted_at := old.terms_accepted_at;
    return new;
  end if;

  -- Una huella documental por versión: no aceptar etiquetas arbitrarias.
  v_git_blob_sha := case new.terms_version
    when '2026-11-10-v1' then '00bf43240080914e5425cad7a37201cfb44d2ec8'
    else null
  end;
  if v_git_blob_sha is null then
    raise exception 'Versión de condiciones no reconocida';
  end if;

  new.terms_accepted_at := now();

  insert into public.maker_terms_acceptances (
    maker_application_id, terms_version, terms_git_blob_sha, accepted_at, acceptance_source
  ) values (
    new.id, new.terms_version, v_git_blob_sha, new.terms_accepted_at, 'maker/equipo'
  );

  return new;
end;
$$;

drop trigger if exists maker_terms_acceptance_audit on public.maker_applications;
create trigger maker_terms_acceptance_audit
before insert or update of terms_version on public.maker_applications
for each row execute function public.record_maker_terms_acceptance();

-- No modificar ni borrar entradas desde accesos ordinarios de la aplicación.
create or replace function public.prevent_maker_terms_acceptance_mutations()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'El historial de aceptaciones es inmutable';
end;
$$;

drop trigger if exists maker_terms_acceptances_immutable on public.maker_terms_acceptances;
create trigger maker_terms_acceptances_immutable
before update or delete on public.maker_terms_acceptances
for each row execute function public.prevent_maker_terms_acceptance_mutations();
