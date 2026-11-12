// Resolución de imágenes de maker por convención de carpetas.
// Se ejecuta SOLO en build (frontmatter de las páginas estáticas), nunca en el
// navegador: lee el sistema de archivos de `public/` con node:fs.
//
// Convención:
//   - Foto de perfil: public/img/productores/<slug>.<ext>
//   - Galería:        public/img/productos/<slug>/foto_1..foto_9.<ext>
//     (hasta 9 fotos; no tienen por qué estar todas)
//
// El <slug> es el campo `slug` de productores.json (minúsculas, sin tildes ni
// espacios). La extensión da igual: vale cualquier imagen (jpg, png, webp…).

import { readdirSync } from "node:fs";
import { join } from "node:path";

const DIR_PUBLIC = join(process.cwd(), "public");
const MAX_FOTOS_GALERIA = 9;
const EXTENSIONES_IMAGEN = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".gif",
]);

function listarArchivos(...segmentos) {
  try {
    return readdirSync(join(DIR_PUBLIC, ...segmentos), { withFileTypes: true })
      .filter((entrada) => entrada.isFile())
      .map((entrada) => entrada.name);
  } catch {
    // Carpeta inexistente: sin fotos todavía.
    return [];
  }
}

function esImagen(nombre) {
  const punto = nombre.lastIndexOf(".");
  if (punto === -1) return false;
  return EXTENSIONES_IMAGEN.has(nombre.slice(punto).toLowerCase());
}

function nombreSinExtension(nombre) {
  const punto = nombre.lastIndexOf(".");
  return punto === -1 ? nombre : nombre.slice(0, punto);
}

// Ruta pública de la foto de perfil, o null si todavía no la ha subido.
export function fotoDeProductor(slug) {
  if (!slug) return null;
  const objetivo = slug.toLowerCase();
  const archivo = listarArchivos("img", "productores")
    .filter(esImagen)
    .find((nombre) => nombreSinExtension(nombre).toLowerCase() === objetivo);
  return archivo ? `/img/productores/${archivo}` : null;
}

// Rutas públicas de la galería (foto_1..foto_9), ordenadas por número.
// Devuelve [] si la carpeta no existe o no tiene fotos.
export function galeriaDeProductor(slug) {
  if (!slug) return [];
  return listarArchivos("img", "productos", slug)
    .map((nombre) => {
      if (!esImagen(nombre)) return null;
      const coincidencia = /^foto_([1-9])$/.exec(nombreSinExtension(nombre));
      if (!coincidencia) return null;
      return { numero: Number(coincidencia[1]), ruta: `/img/productos/${slug}/${nombre}` };
    })
    .filter(Boolean)
    .sort((a, b) => a.numero - b.numero)
    .slice(0, MAX_FOTOS_GALERIA)
    .map((item) => item.ruta);
}
