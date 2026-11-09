// Texto libre tal y como se guarda: en mayúsculas, sin tildes ni diéresis y con
// los espacios normalizados. La Ñ se conserva (MUÑOZ, no MUNOZ). Es la misma
// regla que normalizarTexto en src/lib/makerShared.js; se repite aquí porque
// el navegador se puede saltar.
export function normalizeText(text: string): string {
  return text
    .toUpperCase()
    .replace(/Ñ/g, "\u0000")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\u0000/g, "Ñ")
    .replace(/\s+/g, " ")
    .trim();
}
