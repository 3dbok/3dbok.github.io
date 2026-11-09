// Contrato compartido del alta de makers (/maker) y del formulario de equipo
// (/maker/equipo). Las Edge Functions de Supabase repiten estas listas para
// validar: si cambias una, cambia también su copia en supabase/functions/.

export const MATERIALES = ["PLA", "PETG", "ABS", "Resina", "TPU", "Nylon"];
export const BOQUILLAS = ["0.2 mm", "0.4 mm", "0.6 mm", "0.8 mm"];
export const EXPERIENCIAS = [
  "Menos de 6 meses",
  "Entre 6 meses y 2 años",
  "Más de 2 años",
];

export const FUNCIONES_SUPABASE = "https://rzthxvzbsibblqefhfmf.supabase.co/functions/v1";

// Códigos postales de España: provincias 01 a 52 y tres cifras más.
export const CODIGO_POSTAL = /^(?:0[1-9]|[1-4]\d|5[0-2])\d{3}$/;

// Texto libre tal y como se guarda en Supabase: en mayúsculas, sin tildes ni
// diéresis y con los espacios normalizados. La Ñ se conserva (MUÑOZ, no MUNOZ).
// Las Edge Functions aplican la misma regla (supabase/functions/_shared/texto.ts).
export function normalizarTexto(texto) {
  return String(texto ?? "")
    .toUpperCase()
    .replace(/Ñ/g, "\u0000")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\u0000/g, "Ñ")
    .replace(/\s+/g, " ")
    .trim();
}

const sinAcentos = (texto) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Cuenta nombres sin distinguir tildes y se queda con la versión acentuada:
// entre «Malaga» y «Málaga», mejor «Málaga».
function contar(mapa, nombre) {
  const clave = sinAcentos(nombre);
  const actual = mapa.get(clave) ?? { nombre, veces: 0 };
  actual.veces += 1;
  if (/[^\x00-\x7f]/.test(nombre)) actual.nombre = nombre;
  mapa.set(clave, actual);
}

// Zippopotam devuelve, para cada código postal, una lista de lugares. Muchos
// tienen uno solo, pero otros comparten código entre varios pueblos
// (23650: Torredonjimeno y Torrefuencubierta) o traen decenas de
// urbanizaciones («La Alquería (Marbella)», «Elviria»…).
//
// Devuelve { localidades, sugerida }: todas las localidades sin repetir y,
// solo cuando se puede saber, la más probable (la única que hay, o el
// municipio que más se repite entre paréntesis), que va la primera. Si no se
// puede saber, sugerida queda vacía y el maker tiene que elegir.
export function localidadesDe(lugares) {
  const nombres = (Array.isArray(lugares) ? lugares : [])
    .map((lugar) => String(lugar?.["place name"] ?? "").trim())
    .filter(Boolean);

  const unicas = new Map();
  const municipios = new Map();
  for (const nombre of nombres) {
    contar(unicas, nombre);
    const entreParentesis = nombre.match(/\(([^)]+)\)\s*$/)?.[1]?.trim();
    if (entreParentesis) contar(municipios, entreParentesis);
  }

  let sugerida = "";
  if (unicas.size === 1) {
    sugerida = [...unicas.values()][0].nombre;
  } else if (municipios.size > 0) {
    sugerida = [...municipios.values()].sort((a, b) => b.veces - a.veces)[0].nombre;
  }

  const resto = [...unicas.values()]
    .map(({ nombre }) => nombre)
    .filter((nombre) => sinAcentos(nombre) !== sinAcentos(sugerida))
    .sort((a, b) => a.localeCompare(b, "es"));

  return { localidades: sugerida ? [sugerida, ...resto] : resto, sugerida };
}

// Busca las localidades de un código postal español. Devuelve
// { localidades, sugerida, region } o null si el código no existe. Lanza un
// error si el servicio no responde, para que el formulario deje escribir la
// ciudad a mano.
export async function buscarLocalidades(codigoPostal, { signal, fetchImpl = fetch } = {}) {
  const respuesta = await fetchImpl(`https://api.zippopotam.us/es/${codigoPostal}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) throw new Error(`Zippopotam respondió ${respuesta.status}`);

  const datos = await respuesta.json();
  const { localidades, sugerida } = localidadesDe(datos?.places);
  if (localidades.length === 0) return null;
  return { localidades, sugerida, region: String(datos.places[0]?.state ?? "") };
}
