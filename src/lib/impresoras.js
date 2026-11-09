// Catálogo de marcas y modelos para el formulario de equipo (/maker/equipo).
// Sale de las impresoras que declararon los makers en el formulario antiguo,
// con los nombres oficiales de cada fabricante, para que nadie tenga que
// escribirlos (y no acabemos con «Bambulab», «Bambú lab» y «Babulab»).
// Lo que no esté aquí se escribe con la opción «Otro».
//
// Los «Combo» (el mismo modelo con su sistema multicolor: AMS, ACE, CFS,
// CANVAS…) no van como modelos aparte: A1 Combo es una A1, y si cambia el
// filamento sola da igual: el formulario solo pregunta si puede imprimir en
// multicolor, sí o no.

export const OTRO = "__otro";
export const MAX_IMPRESORAS = 10;

export const MARCAS_IMPRESORA = [
  { marca: "Anycubic", modelos: ["Kobra 2 Max", "Kobra 2 Neo", "Kobra 3", "Kobra 3 Max", "Kobra 3 V2", "Kobra 4", "Kobra S1", "Kobra S1 Max", "Kobra X", "Photon M7 Max"] },
  { marca: "Artillery", modelos: [] },
  {
    marca: "Bambu Lab",
    modelos: ["A1", "A1 mini", "A2L", "H2C", "H2D", "H2S", "P1P", "P1S", "P2S", "X1 Carbon", "X2D"],
  },
  { marca: "Creality", modelos: ["CR-10 SE", "Ender 3", "Ender 3 Pro", "Ender 3 V3 SE", "Ender 5", "Hi", "K1", "K1 Max", "K2", "K2 SE"] },
  { marca: "Elegoo", modelos: ["Centauri Carbon", "Centauri Carbon 2", "Mars 5", "Neptune 4", "Neptune 4 Max", "OrangeStorm Giga", "Saturn 4 Ultra", "Saturn 4 Ultra 16K"] },
  { marca: "Flashforge", modelos: ["AD5X", "Creator 5 Pro"] },
  { marca: "FLSUN", modelos: ["V400"] },
  { marca: "Prusa", modelos: ["MK3S"] },
  { marca: "Sindoh", modelos: ["3DWOX 1"] },
  { marca: "Snapmaker", modelos: ["U1"] },
  { marca: "UniFormation", modelos: ["GK3 Pro"] },
];

export const modelosDe = (marca) =>
  MARCAS_IMPRESORA.find((entrada) => entrada.marca === marca)?.modelos ?? [];

// Texto legible de una lista de impresoras: «Bambu Lab A1, Elegoo Mars 5».
export const describirImpresoras = (impresoras) =>
  impresoras.map(({ marca, modelo }) => `${marca} ${modelo}`.trim()).join(", ");
