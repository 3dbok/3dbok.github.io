import test from "node:test";
import assert from "node:assert/strict";
import { checkLocal, checkRemote, gitBlobSha, extract } from "../scripts/check-legal.mjs";

test("Las versiones legales y la copia congelada son consistentes", () => {
  assert.match(checkLocal(), /^\d{4}-\d{2}-\d{2}-v\d+$/);
});

test("La huella usada es el hash del objeto Git, no el SHA simple del archivo", () => {
  assert.equal(gitBlobSha("test\n"), "9daeafb9864cf43055ae93beb0afd6c7d144bfa4");
});

test("Falla si falta un dato obligatorio en las comprobaciones", () => {
  assert.throws(() => extract("campo", "sin contenido", /version=([^\s]+)/), /CONTROL LEGAL/);
});

test("La comprobación remota acepta una versión exactamente igual", async () => {
  await assert.doesNotReject(() => checkRemote("2026-11-10-v1", {
    url: "https://example.invalid/terms",
    fetchImpl: async () => ({ ok: true, json: async () => ({ termsVersion: "2026-11-10-v1" }) }),
  }));
});

test("La comprobación remota bloquea versiones distintas", async () => {
  await assert.rejects(() => checkRemote("2026-11-10-v1", {
    url: "https://example.invalid/terms",
    fetchImpl: async () => ({ ok: true, json: async () => ({ termsVersion: "2027-02-15-v2" }) }),
  }), /Versiones distintas/);
});

test("La comprobación remota bloquea una función que no expone la versión", async () => {
  await assert.rejects(() => checkRemote("2026-11-10-v1", {
    url: "https://example.invalid/terms",
    fetchImpl: async () => ({ ok: false, status: 405 }),
  }), /HTTP 405/);
});
