// Búsqueda y orden del directorio de makers (/productores) y del selector de
// maker del briefing. Funciones puras: se usan en el navegador y en los tests
// (test/buscadorMakers.test.js); no dependen del DOM.

import { MATERIALES } from "./productorShared.js";

// Minúsculas, sin tildes ni diéresis y con los espacios normalizados, para
// comparar sin que importe cómo escriba la gente («malaga» = «Málaga»).
export function normalizarBusqueda(texto) {
  return String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Fisher–Yates. Devuelve una copia barajada; no toca la lista original.
// `aleatorio` se puede inyectar para los tests.
export function barajar(lista, aleatorio = Math.random) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Lo que el buscador necesita de cada maker, ya normalizado. Se calcula en el
// build y viaja en el HTML (data-*), así el navegador no tiene que cargar el
// JSON entero.
export function datosBusqueda(productor) {
  const materiales = (productor.materiales ?? []).filter((codigo) => MATERIALES[codigo]);

  const texto = normalizarBusqueda(
    [
      productor.nombre,
      productor.ubicacion,
      ...(productor.especialidades ?? []),
      ...(productor.impresoras ?? []),
      ...materiales.map((codigo) => MATERIALES[codigo].label),
      productor.bio,
    ]
      .filter(Boolean)
      .join(" · "),
  );

  return { texto, materiales };
}

// Una palabra coincide si aparece en el texto del maker. Se tolera el plural
// («llaveros» encuentra «llavero» y al revés) quitando la «s»/«es» final.
function coincidePalabra(texto, palabra) {
  if (texto.includes(palabra)) return true;
  if (palabra.length > 4 && palabra.endsWith("es") && texto.includes(palabra.slice(0, -2))) {
    return true;
  }
  return palabra.length > 3 && palabra.endsWith("s") && texto.includes(palabra.slice(0, -1));
}

// ¿Encaja un maker con los filtros?
//
// - q: texto libre (nombre, ciudad, pieza/especialidad, impresora, bio…).
//   Tienen que aparecer TODAS sus palabras.
// - materiales: códigos (PLA, PETG…). Basta con que trabaje UNO de ellos.
//
// Entre filtros distintos se exigen todos (texto Y material).
export function coincideMaker(datos, { q = "", materiales = [] } = {}) {
  const palabras = normalizarBusqueda(q).split(" ").filter(Boolean);
  if (!palabras.every((palabra) => coincidePalabra(datos.texto, palabra))) return false;

  return materiales.length === 0 || datos.materiales.some((codigo) => materiales.includes(codigo));
}
