#!/usr/bin/env node
/**
 * Bloqueo de despliegue: versiones legales coherentes en web, función y SQL.
 * Uso local: npm run check:legal
 * Uso en CI: npm run check:legal -- --remote
 * El modo --remote exige que maker-details publicado en Supabase informe de su
 * versión activa mediante GET. Si no responde, el despliegue queda bloqueado.
 */
import { readFileSync, readdirSync, appendFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const fail = (msg) => { throw new Error(`CONTROL LEGAL: ${msg}`); };

export function gitBlobSha(contents) {
  const buffer = Buffer.from(contents, "utf8");
  return createHash("sha1").update(`blob ${buffer.length}\0`).update(buffer).digest("hex");
}
export function extract(label, content, re) {
  const match = content.match(re);
  if (!match?.[1]) fail(`No se encuentra ${label}.`);
  return match[1];
}
export function checkLocal() {
  const page = read("src/pages/condiciones.astro");
  const form = read("src/pages/maker/equipo.astro");
  const server = read("supabase/functions/maker-details/index.ts");
  const migrations = readdirSync(resolve(ROOT, "supabase/migrations")).filter((f) => f.endsWith(".sql")).sort().map((f) => read(`supabase/migrations/${f}`));
  const migrationText = migrations.join("\n");
  const version = extract("versión del formulario", form, /const VERSION_CONDICIONES = "([^"]+)"/);
  const serverVersion = extract("versión de la función", server, /const ACTIVE_TERMS_VERSION = "([^"]+)"/);
  if (!/^\d{4}-\d{2}-\d{2}-v\d+$/.test(version)) fail(`Identificador de versión inválido: ${version}`);
  if (version !== serverVersion) fail(`Versiones diferentes: formulario=${version}, función=${serverVersion}.`);

  const archivePath = `docs/legal/versions/${version}.astro`;
  const recordPath = `docs/legal/versions/${version}.md`;
  let archive, record;
  try {
    archive = read(archivePath);
    record = read(recordPath);
  } catch {
    fail(`Falta el texto histórico y/o registro de la versión ${version} en docs/legal/versions/.`);
  }

  if (archive !== page) fail(`Las condiciones publicables no coinciden con ${archivePath}. Si modificas el texto, crea una nueva versión y su histórico.`);
  const sha = gitBlobSha(page);
  const registeredSha = extract("huella del histórico", record, /Git blob SHA del archivo contractual cerrado:\*\* \`([a-f0-9]{40})\`/);
  const sqlMatches = [...migrationText.matchAll(/when '([^']+)' then '([a-f0-9]{40})'/g)].filter((m) => m[1] === version);
  if (sqlMatches.length !== 1) fail(`La versión ${version} debe estar registrada exactamente una vez en las migraciones SQL.`);
  const sqlSha = sqlMatches[0][2];
  if (sha !== registeredSha || sha !== sqlSha) fail(`Huella incorrecta: contenido=${sha}, histórico=${registeredSha}, SQL=${sqlSha}.`);
  if (!record.includes(`Versión: \`${version}\``)) fail(`El registro histórico no identifica ${version}.`);
  if (!page.includes(`Versión de las condiciones: ${version}`)) fail("La página no muestra la versión vigente.");
  if (!form.includes('name="termsAccepted"') || !form.includes('data-terms-accepted') || !form.includes('required')) fail("Falta la casilla obligatoria de aceptación.");
  if (!form.includes('name="termsVersion"') || !server.includes('value("termsAccepted") !== "true"') || !server.includes('value("termsVersion") !== ACTIVE_TERMS_VERSION')) fail("Falta validar en el servidor la versión y aceptación enviadas.");
  if (!migrationText.includes("maker_terms_acceptances") || !migrationText.includes("terms_accepted_at")) fail("Falta el historial de aceptaciones.");
  console.log(`✅ Control legal local correcto: ${version} (Git blob ${sha}).`);
  return version;
}

export async function checkRemote(version, { fetchImpl = fetch, url } = {}) {
  // Siempre contra la función realmente desplegada, no contra el código Git.
  const endpoint = url ?? "https://rzthxvzbsibblqefhfmf.supabase.co/functions/v1/maker-details";
  let response;
  try {
    response = await fetchImpl(endpoint, { method: "GET", headers: { Accept: "application/json", "Cache-Control": "no-cache" }, signal: AbortSignal.timeout(12000) });
  } catch (e) {
    fail(`No se pudo comprobar la versión de Supabase (${e.message}). Despliegue bloqueado.`);
  }
  if (!response.ok) fail(`Supabase respondió HTTP ${response.status} al consultar la versión. Actualiza primero la Edge Function.`);
  let body;
  try { body = await response.json(); } catch { fail("La función desplegada no devolvió JSON válido."); }
  if (body?.termsVersion !== version) fail(`Versiones distintas entre web (${version}) y Supabase desplegado (${body?.termsVersion ?? "desconocida"}). Despliega primero la función.`);
  console.log(`✅ Supabase desplegado coincide con la web: ${version}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const version = checkLocal();
    if (process.argv.includes("--remote")) await checkRemote(version);
    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY,
        `### Condiciones de uso comprobadas\n\n- Versión: \`${version}\`\n- Repositorio: coherente\n- Supabase: ${process.argv.includes("--remote") ? "versión desplegada verificada" : "no consultado en esta ejecución"}\n\n`);
    }
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exitCode = 1;
  }
}
