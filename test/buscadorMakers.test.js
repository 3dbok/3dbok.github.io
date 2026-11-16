import { test } from "node:test";
import assert from "node:assert/strict";
import {
  barajar,
  coincideMaker,
  datosBusqueda,
  normalizarBusqueda,
} from "../src/lib/buscadorMakers.js";

const maker = datosBusqueda({
  nombre: "Bernylop",
  ubicacion: "Málaga, España",
  bio: "Taller pequeño en casa.",
  especialidades: ["Decoración", "Piezas de Airsoft", "Llaveros"],
  materiales: ["PLA", "PETG", "XYZ"],
  impresoras: ["Bambu Lab P1S"],
});

test("normaliza tildes, mayúsculas y espacios", () => {
  assert.equal(normalizarBusqueda("  MÁLAGA   capital "), "malaga capital");
});

test("datosBusqueda ignora materiales desconocidos", () => {
  assert.deepEqual(maker.materiales, ["PLA", "PETG"]);
});

test("busca por nombre, ciudad, pieza e impresora sin importar tildes", () => {
  assert.ok(coincideMaker(maker, { q: "bernylop" }));
  assert.ok(coincideMaker(maker, { q: "malaga" }));
  assert.ok(coincideMaker(maker, { q: "decoracion" }));
  assert.ok(coincideMaker(maker, { q: "bambu p1s" }));
  assert.ok(!coincideMaker(maker, { q: "valencia" }));
});

test("exige todas las palabras y tolera plurales", () => {
  assert.ok(coincideMaker(maker, { q: "airsoft málaga" }));
  assert.ok(!coincideMaker(maker, { q: "airsoft valencia" }));
  assert.ok(coincideMaker(maker, { q: "llavero" }));
  assert.ok(coincideMaker(maker, { q: "decoraciones" }));
});

test("material: basta con uno de los elegidos, y se combina con el texto", () => {
  assert.ok(coincideMaker(maker, {}));
  assert.ok(coincideMaker(maker, { materiales: ["TPU", "PETG"] }));
  assert.ok(!coincideMaker(maker, { materiales: ["TPU"] }));
  assert.ok(coincideMaker(maker, { q: "malaga", materiales: ["PLA"] }));
  assert.ok(!coincideMaker(maker, { q: "valencia", materiales: ["PLA"] }));
});

test("barajar devuelve una permutación sin tocar el original", () => {
  const original = [1, 2, 3, 4, 5];
  const secuencia = [0.1, 0.9, 0.5, 0.3];
  let i = 0;
  const resultado = barajar(original, () => secuencia[i++ % secuencia.length]);
  assert.deepEqual(original, [1, 2, 3, 4, 5]);
  assert.deepEqual([...resultado].sort(), [1, 2, 3, 4, 5]);
  assert.notDeepEqual(resultado, original);
});
