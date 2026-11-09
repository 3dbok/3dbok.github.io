import { test } from "node:test";
import assert from "node:assert/strict";

import { MARCAS_IMPRESORA, describirImpresoras, modelosDe } from "../src/lib/impresoras.js";

const clave = (texto) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

test("el catálogo no repite marcas ni modelos", () => {
  const marcas = MARCAS_IMPRESORA.map(({ marca }) => clave(marca));
  assert.equal(new Set(marcas).size, marcas.length);
  for (const { marca, modelos } of MARCAS_IMPRESORA) {
    const claves = modelos.map(clave);
    assert.equal(new Set(claves).size, claves.length, `modelos repetidos en ${marca}`);
  }
});

test("los Combo no son modelos aparte: el multicolor se pregunta aparte", () => {
  for (const { marca, modelos } of MARCAS_IMPRESORA) {
    for (const modelo of modelos) {
      assert.ok(!/combo/i.test(modelo), `${marca} ${modelo}`);
    }
  }
});

// Modelos que ya usan los makers dados de alta: tienen que seguir en el catálogo.
const MODELOS_EN_USO = [
  ["Anycubic", ["Kobra 2 Max", "Kobra 2 Neo", "Kobra 3", "Kobra 3 Max", "Kobra 3 V2", "Kobra 4", "Kobra S1", "Kobra S1 Max", "Kobra X", "Photon M7 Max"]],
  ["Bambu Lab", ["A1", "A1 mini", "A2L", "H2C", "H2D", "H2S", "P1P", "P1S", "P2S", "X1 Carbon", "X2D"]],
  ["Creality", ["CR-10 SE", "Ender 3", "Ender 3 Pro", "Ender 3 V3 SE", "Ender 5", "Hi", "K1", "K1 Max", "K2", "K2 SE"]],
  ["Elegoo", ["Centauri Carbon", "Centauri Carbon 2", "Mars 5", "Neptune 4", "Neptune 4 Max", "OrangeStorm Giga", "Saturn 4 Ultra", "Saturn 4 Ultra 16K"]],
  ["Flashforge", ["AD5X", "Creator 5 Pro"]],
  ["FLSUN", ["V400"]],
  ["Prusa", ["MK3S"]],
  ["Sindoh", ["3DWOX 1"]],
  ["Snapmaker", ["U1"]],
  ["UniFormation", ["GK3 Pro"]],
];

test("los modelos en uso siguen en el catálogo", () => {
  for (const [marca, modelos] of MODELOS_EN_USO) {
    for (const modelo of modelos) {
      assert.ok(modelosDe(marca).includes(modelo), `${marca} ${modelo}`);
    }
  }
});

test("modelosDe devuelve una lista vacía para marcas fuera del catálogo", () => {
  assert.deepEqual(modelosDe("Marca inventada"), []);
  assert.deepEqual(modelosDe("Artillery"), []);
});

test("describirImpresoras une marca y modelo de cada impresora", () => {
  assert.equal(
    describirImpresoras([
      { marca: "BAMBU LAB", modelo: "A1" },
      { marca: "ELEGOO", modelo: "MARS 5" },
    ]),
    "BAMBU LAB A1, ELEGOO MARS 5",
  );
  assert.equal(describirImpresoras([]), "");
});
