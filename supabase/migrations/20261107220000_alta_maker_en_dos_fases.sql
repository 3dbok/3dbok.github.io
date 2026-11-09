-- Alta de makers en dos formularios.
-- 1) register-maker guarda solo nombre, apellidos, código postal, ciudad,
--    email y experiencia.
-- 2) maker-details completa la misma fila con impresoras, multicolor,
--    materiales, boquillas y colores (formulario /maker/equipo, que mandamos
--    por email al revisar el alta).

alter table public.maker_applications
  add column if not exists last_name text,
  add column if not exists postal_code text,
  add column if not exists details_submitted_at timestamptz,
  -- [{ "marca": "BAMBU LAB", "modelo": "A1" }, ...]; printer_model guarda lo
  -- mismo como texto («BAMBU LAB A1, ELEGOO MARS 5»).
  add column if not exists printers jsonb,
  add column if not exists multicolor boolean;

-- El equipo ya no llega con el alta: estas columnas quedan vacías hasta el segundo formulario.
alter table public.maker_applications
  alter column printer_model drop not null,
  alter column materials drop not null,
  alter column nozzle_sizes drop not null,
  alter column colors drop not null;
