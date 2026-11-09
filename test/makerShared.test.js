import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CODIGO_POSTAL,
  buscarLocalidades,
  localidadesDe,
  normalizarTexto,
} from "../src/lib/makerShared.js";

test("normalizarTexto pasa a mayúsculas, quita tildes y conserva la Ñ", () => {
  assert.equal(normalizarTexto("José Ángel"), "JOSE ANGEL");
  assert.equal(normalizarTexto("Muñoz Peña"), "MUÑOZ PEÑA");
  assert.equal(normalizarTexto("  Güemes   de la  Fuente "), "GUEMES DE LA FUENTE");
  assert.equal(normalizarTexto("Málaga"), "MALAGA");
  assert.equal(normalizarTexto("A Coruña"), "A CORUÑA");
  assert.equal(normalizarTexto("Marrón"), "MARRON");
  assert.equal(normalizarTexto(undefined), "");
});

test("CODIGO_POSTAL solo acepta provincias españolas 01-52", () => {
  for (const valido of ["01001", "08001", "29001", "52001"]) {
    assert.ok(CODIGO_POSTAL.test(valido), valido);
  }
  for (const invalido of ["00001", "53001", "99999", "2900", "290011", "29a01"]) {
    assert.ok(!CODIGO_POSTAL.test(invalido), invalido);
  }
});

const lugares = (...nombres) => nombres.map((nombre) => ({ "place name": nombre }));

test("localidadesDe con una sola localidad la sugiere", () => {
  assert.deepEqual(localidadesDe(lugares("Málaga")), {
    localidades: ["Málaga"],
    sugerida: "Málaga",
  });
});

test("localidadesDe con varios pueblos los devuelve todos y no sugiere ninguno", () => {
  // 23650 en Zippopotam
  assert.deepEqual(localidadesDe(lugares("Torrefuencubierta", "Torredonjimeno")), {
    localidades: ["Torredonjimeno", "Torrefuencubierta"],
    sugerida: "",
  });
});

test("localidadesDe sugiere primero el municipio entre paréntesis y quita repetidos por tildes", () => {
  // Extracto del 29600 en Zippopotam
  assert.deepEqual(
    localidadesDe(
      lugares(
        "Andasol",
        "La Alqueria (Marbella)",
        "Elviria",
        "Marbella",
        "Pueblo Andaluz (Marbella)",
        "La Alquería (Marbella)",
      ),
    ),
    {
      localidades: ["Marbella", "Andasol", "Elviria", "La Alquería (Marbella)", "Pueblo Andaluz (Marbella)"],
      sugerida: "Marbella",
    },
  );
});

test("localidadesDe sin lugares devuelve una lista vacía", () => {
  assert.deepEqual(localidadesDe([]), { localidades: [], sugerida: "" });
  assert.deepEqual(localidadesDe(undefined), { localidades: [], sugerida: "" });
});

test("buscarLocalidades devuelve las localidades, null si no existe y error si falla", async () => {
  const respuesta = (status, cuerpo) => async () => ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => cuerpo,
  });

  assert.deepEqual(
    await buscarLocalidades("23650", {
      fetchImpl: respuesta(200, {
        places: [
          { "place name": "Torrefuencubierta", state: "Andalucia" },
          { "place name": "Torredonjimeno", state: "Andalucia" },
        ],
      }),
    }),
    { localidades: ["Torredonjimeno", "Torrefuencubierta"], sugerida: "", region: "Andalucia" },
  );
  assert.equal(await buscarLocalidades("29999", { fetchImpl: respuesta(404, {}) }), null);
  assert.equal(await buscarLocalidades("29999", { fetchImpl: respuesta(200, {}) }), null);
  await assert.rejects(buscarLocalidades("29001", { fetchImpl: respuesta(503, {}) }));
});
