# Cómo actualizar las Condiciones de Uso de 3dbok

**Leer antes de cambiar** `src/pages/condiciones.astro`, el formulario `/maker/equipo/` o la función de Supabase `maker-details`.

## Idea general

- **GitHub conserva el texto contractual exacto** por versión.
- **Supabase conserva las aceptaciones**, con maker, versión, fecha y huella del texto.
- **El formulario** muestra y exige la versión que el maker debe aceptar.
- **La Edge Function de Supabase** valida del lado del servidor que se haya enviado una aceptación válida para la versión vigente.
- **GitHub Actions bloquea la publicación** si las versiones del formulario, función, SQL e histórico no coinciden, y contrasta también qué versión está realmente **desplegada** en Supabase.

La versión cerrada inicial es `2026-11-10-v1`. Su texto se conserva en:
- `src/pages/condiciones.astro` (versión pública vigente)
- `docs/legal/versions/2026-11-10-v1.astro` (copia textual congelada)
- `docs/legal/versions/2026-11-10-v1.md` (registro, commit y Git blob SHA)

**Nunca edites la copia archivada de una versión ya aceptada.** La página vigente solo puede cambiar cuando también cambia su identificador de versión.

## Procedimiento para cambiar las condiciones (ejemplo: v2)

1. **Abrir una rama nueva y redactar** las modificaciones, con revisión legal adecuada si cambian derechos, comisiones, garantías o responsabilidades. Determinar cuándo entrarán en vigor y qué ocurre con los acuerdos en curso.
2. **Crear un identificador nuevo**, como `2027-02-15-v2`. No reutilizar nunca `2026-11-10-v1`, aunque el cambio parezca pequeño.
3. Editar `src/pages/condiciones.astro` para reflejar el texto final y la nueva indicación visible `Versión de las condiciones: 2027-02-15-v2`.
4. **Crear una copia completa y literal** del archivo vigente nuevo en `docs/legal/versions/2027-02-15-v2.astro`. El contenido debe ser idéntico byte por byte al de `src/pages/condiciones.astro`.
5. Calcular la huella de Git del texto final: `git hash-object src/pages/condiciones.astro`. Crear `docs/legal/versions/2027-02-15-v2.md` con versión, fecha, huella de Git, enlace permanente a un commit que contenga el texto y un resumen de cambios. **No modificar la entrada de v1.**
6. Actualizar `VERSION_CONDICIONES` en `src/pages/maker/equipo.astro` y `ACTIVE_TERMS_VERSION` en `supabase/functions/maker-details/index.ts`.
7. **Añadir una migración SQL NUEVA** bajo `supabase/migrations/`, sin reescribir las que ya se ejecutaron, para que la función `record_maker_terms_acceptance()` reconozca la nueva pareja versión/huella. Conservar el historial de versiones anteriores para que las aceptaciones existentes sigan siendo interpretables. La prueba `scripts/check-legal.mjs` exige una entrada de tipo `when '2027-02-15-v2' then '<git-blob-sha>'` en las migraciones; no repetirla en varias migraciones.
8. Ejecutar `npm run check:legal` y `npm test` en local. Corregir fallos **sin saltarse el control**. Abrir PR a `main` y verificar la acción «Comprobaciones legales de pull requests». La protección de rama de GitHub debe configurarse para exigir este check si también se pretende impedir hacer merge con tests fallidos.
9. **Primero desplegar Supabase:** aplicar la migración y desplegar `maker-details` con la nueva versión. Antes de modificar producción, planificar una transición compatible: el frontend anterior puede seguir enviando la versión anterior mientras se publica GitHub Pages. La función actual solo acepta una versión; hay que ampliar deliberadamente ese mecanismo si se necesita compatibilidad temporal, sin perder la comprobación y el registro de qué versión aceptó cada maker.
10. Comprobar el endpoint desplegado por HTTPS (`GET /functions/v1/maker-details` debe devolver `{"termsVersion":"2027-02-15-v2"}`) y ejecutar `npm run check:legal:remote`. Este comando **falla** si Supabase es inaccesible o devuelve otra versión. También verificar manualmente que la migración se aplicó realmente: el endpoint de versión **no prueba por sí mismo** el esquema de la base de datos.
11. Fusionar y desplegar la web cuando las comprobaciones pasen. `.github/workflows/deploy.yml` exige nuevamente la comprobación remota **antes del build y de subir el artefacto**. El comando `npm run build` vuelve a ejecutar la validación local. No anular ni comentar esas comprobaciones para forzar una publicación.
12. **Gestionar makers existentes.** Si el cambio exige nueva aceptación (en especial precios/comisiones), notificarlo, facilitar el texto y solicitar aceptación expresa antes de aplicar nuevas condiciones a nuevos pedidos. La aceptación original no supone aceptación automática de versiones posteriores. El formulario `/maker/equipo/` solo cubre la primera aceptación; el proceso de reaceptación para makers activos se debe construir antes de introducir una versión con impacto contractual.

## ¿Qué bloquea exactamente el despliegue?

**Comprobación local** (`npm run check:legal`, también incluida en `npm run build`):
- Identificadores de versión distintos entre formulario y función.
- Versión sin documento histórico `.astro` y ficha `.md`.
- Texto público distinto de la copia histórica de la misma versión.
- Huella Git distinta entre texto público, ficha histórica y registro SQL.
- Ausencia del checkbox obligatorio o de la validación del servidor.
- Ausencia de la tabla de auditoría de aceptaciones.

**Comprobación de producción** (`npm run check:legal:remote`, en el workflow de despliegue a Pages):
- Error o indisponibilidad de la Edge Function `maker-details` desplegada en Supabase.
- Respuesta sin `termsVersion`.
- Versión remota distinta de la versión del formulario y código del repositorio.

Si falla un check, el workflow de despliegue no publica la nueva web. No borra ni revierte automáticamente la web que ya esté publicada.

**Límite:** la comprobación remota verifica la versión que **declara** la función publicada, no que la migración SQL se haya aplicado o que su lógica esté funcionando. La migración debe desplegarse y probarse por separado. Tampoco certifica identidad, consentimiento válido, revisión jurídica ni la sincronización de herramientas de correo.

## Primer despliegue de esta protección

Mientras la función publicada en Supabase no exponga `GET /maker-details` con `termsVersion`, **todo intento de desplegar desde main fallará** al llegar a la comprobación remota. Para activarla:

1. Validar la migración SQL en un entorno de pruebas y aplicarla a la base de datos.
2. Desplegar el nuevo código de `maker-details` con el endpoint `GET`.
3. Comprobar su respuesta y probar un envío real sin aceptación, con versión inválida y con aceptación correcta.
4. Desplegar la web. Mientras se completa esta secuencia, no fusionar la rama `legal` con `main` a ciegas.

**Advertencia de identidad:** el formulario actual permite escribir un correo sin autenticar al maker. Antes de utilizar la aceptación como prueba contractual atribuible a esa persona debe implementarse un enlace de un solo uso u OTP por email.

**Advertencia legal:** el Aviso Legal sigue sin identificar al titular del servicio. El control automático de versiones no resuelve esa obligación.

## Dónde están las piezas del sistema

| Archivo | Función |
| --- | --- |
| `src/pages/condiciones.astro` | Texto legal vigente |
| `src/pages/maker/equipo.astro` | Casilla y versión que ve el maker |
| `supabase/functions/maker-details/index.ts` | Comprobación de aceptación y endpoint remoto de versión |
| `supabase/migrations/20261110113000_maker_terms_acceptances.sql` | Tablas/trigger de auditoría inicial |
| `docs/legal/versions/` | Textos íntegros y fichas de todas las versiones |
| `scripts/check-legal.mjs` | Verificador local y remoto |
| `.github/workflows/check-legal.yml` | Validación en pull requests |
| `.github/workflows/deploy.yml` | Bloqueo de despliegue a Pages |
| `package.json` | Comandos npm para comprobar y compilar |

## Comandos rápidos

```bash
npm run check:legal          # Comprueba versión, archivo histórico y SQL en el repositorio
npm run check:legal:remote   # Además verifica la función desplegada en Supabase
npm test                     # Pruebas de la aplicación
npm run build                # No compila si el control legal local falla
git hash-object src/pages/condiciones.astro
```
