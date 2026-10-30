// Modelos del boquerón de la portada. Cada modelo devuelve sus capas ya
// dibujadas (SVG en coordenadas del pez: morro a la izquierda, x de -152 a
// 152) y las definiciones que necesitan. El componente PiezaEnCapas solo las
// apila, las proyecta sobre la bancada y las imprime una a una.
//
// Todos comparten la anatomía de un boquerón de verdad: cuerpo largo y
// esbelto, morro saliente, ojo grande y adelantado, mandíbula larga, una sola
// dorsal a media espalda, pélvicas por delante de ella, anal atrasada y cola
// muy ahorquillada.

import { mezclarColor, tonosDePared } from "./capas.js";

const limpiar = (d) => d.trim().replace(/\s+/g, " ");
const n2 = (n) => +n.toFixed(2);

const MEDIO_ALTO = 28; // medio alto del cuerpo en su parte más ancha
const LARGO = 134; // medio largo del cuerpo, del centro al morro
const CENTRO_X = -16; // centro del cuerpo: cada capa se cierra hacia aquí

export const MODELOS = {
  natural: {
    nombre: "Natural",
    descripcion:
      "PLA natural de un solo color. El detalle va en relieve: escamas, opérculo, radios en las aletas y la banda plateada del costado.",
    pie: "Boquerón en PLA natural, 24 capas de 0.2 mm con soporte en árbol.",
  },
  tricolor: {
    nombre: "Tricolor",
    descripcion:
      "Impreso con cambiador de filamento: lomo verdeazulado, banda plateada y vientre plata, como recién sacado de la lonja.",
    pie: "Boquerón en tres colores de PLA con soporte en árbol.",
  },
  articulado: {
    nombre: "Articulado",
    descripcion:
      "Diez piezas que se imprimen ya unidas por bisagras y sin soportes. Al sacarlo de la cama, se mueve como un pez de verdad.",
    pie: "Boquerón articulado en PLA arena: diez piezas impresas ya unidas.",
  },
  lowpoly: {
    nombre: "Low poly",
    descripcion:
      "Facetado como un modelo de pocas caras, con cada plano iluminado por separado. Es la estética más reconocible de la impresión 3D.",
    pie: "Boquerón low poly en PLA plata con soporte en árbol.",
  },
};

// --- Anatomía compartida ------------------------------------------------

const CUERPO = limpiar(`
  M -152 -2
  C -146 -9 -134 -16 -116 -20
  C -88 -26 -50 -28 -16 -28
  C 30 -27 74 -20 100 -11
  C 108 -8 114 -5 120 -3
  L 122 0
  L 120 3
  C 112 6 106 9 98 13
  C 62 24 0 29 -58 26
  C -92 22 -120 13 -138 6
  C -146 3 -150 1 -152 -2
  Z
`);

const ALETAS = {
  dorsal: "M -8 -26 C -4 -40 2 -50 8 -52 C 12 -46 16 -36 20 -25 Z",
  pelvica: "M -30 26 C -26 33 -20 39 -16 40 C -16 34 -18 30 -18 27 Z",
  anal: "M 26 24 C 30 34 36 42 40 44 C 44 38 46 32 50 22 Z",
  cola: limpiar(`
    M 110 -6
    C 124 -16 138 -30 152 -40
    C 146 -24 136 -10 132 0
    C 136 10 146 24 152 40
    C 138 30 124 16 110 6
    Z
  `),
};

// Radios de las aletas: de la base al borde, como en la aleta de verdad.
const RADIOS = [
  ...[
    [-4, -27, -3, -40],
    [0, -27, 1, -46],
    [4, -27, 5, -50],
    [8, -27, 9, -50],
    [12, -27, 13, -43],
    [16, -26, 17, -33],
  ],
  ...[
    [30, 24, 31, 35],
    [34, 24, 35, 40],
    [38, 23, 39, 43],
    [42, 23, 43, 40],
    [46, 23, 46, 32],
  ],
  ...[
    [-26, 27, -24, 34],
    [-22, 27, -19, 37],
  ],
  ...[
    [116, -3, 128, -14],
    [116, -2, 136, -22],
    [116, -2, 144, -31],
    [116, -1, 150, -38],
    [116, 3, 128, 14],
    [116, 2, 136, 22],
    [116, 2, 144, 31],
    [116, 1, 150, 38],
  ],
].map(([x1, y1, x2, y2]) => `M ${x1} ${y1} L ${x2} ${y2}`).join(" ");

// Soporte en árbol: cada árbol nace de un pie en la cama, sube en tronco y se
// abre en ramas curvas hasta tocar la aleta. Las puntas caen dentro de cada
// aleta y fuera del cuerpo, y ninguna rama se separa más de lo que una
// impresora salvaría.
const ARBOLES = [
  { pie: [6, -48], puntas: [[0, -37], [11, -42]] }, // dorsal
  { pie: [-23, 41], puntas: [[-21, 33]] }, // pélvica
  { pie: [38, 45], puntas: [[35, 34], [42, 36]] }, // anal
  { pie: [131, -15], puntas: [[127, -9], [140, -25]] }, // lóbulo de arriba
  { pie: [131, 15], puntas: [[127, 9], [140, 25]] }, // lóbulo de abajo
];

const suave = (t) => t * t * (3 - 2 * t);

function soporteEnArbol(capasSoporte, relleno) {
  const TRONCO = 0.4;
  const nudo = (pie, punta, s) => {
    const t = s <= TRONCO ? 0 : suave((s - TRONCO) / (1 - TRONCO));
    return { x: pie[0] + (punta[0] - pie[0]) * t, y: pie[1] + (punta[1] - pie[1]) * t, t };
  };
  const circulo = (x, y, r) => `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r)}" fill="${relleno}"/>`;

  // Cada rama se dibuja como un rastro desde donde estaba en la capa de
  // abajo, para que se lea como una varilla continua y no como cuentas.
  return Array.from({ length: capasSoporte }, (_, k) => {
    const s = k / (capasSoporte - 1);
    const antes = Math.max(k - 1, 0) / (capasSoporte - 1);
    return ARBOLES.map(({ pie, puntas }) => {
      if (k === 0) return circulo(pie[0], pie[1], 7);
      const ramas = s <= TRONCO ? [puntas[0]] : puntas;
      return ramas
        .map((punta) => {
          const a = nudo(pie, punta, antes);
          const b = nudo(pie, punta, s);
          const r = s <= TRONCO ? 4 : 2.8 - 1.2 * b.t;
          return [1 / 3, 2 / 3, 1]
            .map((f) => circulo(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, r))
            .join("");
        })
        .join("");
    }).join("");
  });
}

// Sección en elipse: `u` recorre el alto de -1 (cama) a 1 (lomo) y vale 0 en
// la altura media, donde salen las aletas. Cada capa se mete hacia dentro lo
// que pide la elipse, más por morro y cola que por lomo y vientre.
function perfilElipse({ capas, capaAleta, capasAleta, corteCama, corteLomo, afilado }) {
  const medio = capaAleta + (capasAleta - 1) / 2;
  return Array.from({ length: capas }, (_, i) => {
    const u = i < medio ? (-corteCama * (medio - i)) / medio : (corteLomo * (i - medio)) / (capas - 1 - medio);
    const metido = MEDIO_ALTO * (1 - Math.sqrt(1 - u * u));
    return {
      sx: n2(1 - (metido * afilado) / LARGO),
      sy: n2(1 - metido / MEDIO_ALTO),
      aleta: i >= capaAleta && i < capaAleta + capasAleta,
    };
  });
}

const escala = ({ sx, sy }) =>
  `translate(${CENTRO_X} 0) scale(${sx} ${sy}) translate(${-CENTRO_X} 0)`;

// Un círculo que sigue siendo redondo dentro de una capa encogida.
const redondo = (capa, cx, cy, r, atributos) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${n2(r / capa.sx)}" ry="${n2(r / capa.sy)}" ${atributos}/>`;

const trazo = (color, ancho) =>
  `fill="none" stroke="${color}" stroke-width="${ancho}" stroke-linecap="round" vector-effect="non-scaling-stroke"`;

const calor = (href) => `<use class="capa__calor" href="#${href}" fill="#e5592f" opacity="0"/>`;

const caraCabeza = (capa, { ojo, iris, linea }) =>
  [
    `<path d="M -96 -20 C -86 -8 -86 8 -96 19" ${trazo(linea, 1.2)}/>`,
    `<path d="M -103 -16 C -96 -6 -96 6 -103 15" ${trazo(linea, 0.8)}/>`,
    `<path d="M -150 -1 C -138 3 -120 5 -104 1" ${trazo(linea, 1)}/>`,
    `<circle cx="-138" cy="-7" r="1.1" fill="${linea}"/>`,
    redondo(capa, -116, -6, 7.5, `fill="${ojo}"`),
    redondo(capa, -116, -6, 5.6, `fill="${iris}"`),
    redondo(capa, -116, -6, 3.6, `fill="#14151f"`),
    redondo(capa, -117.6, -7.6, 1.3, `fill="rgb(255 255 255 / 0.85)"`),
  ].join("");

const aletaPectoral = (relleno, linea) =>
  `<path d="M -88 6 C -78 9 -68 13 -60 21 C -70 20 -80 16 -89 11 Z" fill="${relleno}"/>` +
  `<path d="M -87 8 L -64 19 M -87 9 L -67 20 M -88 10 L -72 19" ${trazo(linea, 0.6)}/>`;

function defsComunes(p) {
  return [
    `<path id="${p}-cuerpo" d="${CUERPO}"/>`,
    ...Object.entries(ALETAS).map(([nombre, d]) => `<path id="${p}-${nombre}" d="${d}"/>`),
  ].join("");
}

const usarAletas = (p, relleno) =>
  Object.keys(ALETAS)
    .map((nombre) => `<use href="#${p}-${nombre}" fill="${relleno}"/>`)
    .join("");

const calorAletas = (p) => Object.keys(ALETAS).map((nombre) => calor(`${p}-${nombre}`)).join("");

// --- Natural: un color, detalle en relieve ------------------------------

function natural(p) {
  const CAPAS = 24;
  const CAPA_ALETA = 11;
  const perfil = perfilElipse({
    capas: CAPAS,
    capaAleta: CAPA_ALETA,
    capasAleta: 2,
    corteCama: 0.72,
    corteLomo: 0.78,
    afilado: 2.2,
  });
  const tonos = tonosDePared(CAPAS, "#6f6c5c", "#eeebdc");
  const soportes = soporteEnArbol(CAPA_ALETA, `url(#${p}-soporte)`);
  const linea = "rgb(23 26 51 / 0.24)";

  const capas = perfil.map((capa, i) => {
    const cima = i === CAPAS - 1;
    const ultimaAleta = i === CAPA_ALETA + 1;
    const piezas = [
      capa.aleta ? usarAletas(p, mezclarColor(tonos[i], "#ffffff", 0.18)) : "",
      `<use href="#${p}-cuerpo" fill="${cima ? `url(#${p}-cara)` : tonos[i]}"/>`,
      capa.aleta ? calorAletas(p) : "",
      calor(`${p}-cuerpo`),
      ultimaAleta ? `<path d="${RADIOS}" ${trazo("rgb(23 26 51 / 0.2)", 0.7)}/>` : "",
      cima
        ? [
            `<use href="#${p}-cuerpo" fill="url(#${p}-escamas)" clip-path="url(#${p}-tras-cabeza)"/>`,
            `<path d="M -88 -6 C -40 -9 30 -8 116 -3" ${trazo("rgb(23 26 51 / 0.1)", 1)}/>`,
            `<path d="M -88 -2 C -40 -5 30 -4 116 0" ${trazo("rgb(255 255 255 / 0.85)", 3.2)}/>`,
            aletaPectoral("#f7f5ea", linea),
            caraCabeza(capa, { ojo: "#bdb9a3", iris: "#8d8a78", linea }),
          ].join("")
        : "",
    ].join("");
    return { sx: capa.sx, svg: (soportes[i] ?? "") + `<g transform="${escala(capa)}">${piezas}</g>` };
  });

  const defs = [
    defsComunes(p),
    `<linearGradient id="${p}-cara" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d2cfbd"/><stop offset="40%" stop-color="#fbfaf3"/>
      <stop offset="62%" stop-color="#f3f1e4"/><stop offset="100%" stop-color="#d8d4bf"/>
    </linearGradient>`,
    `<linearGradient id="${p}-soporte" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#a5a290"/><stop offset="60%" stop-color="#f1efe3"/>
      <stop offset="100%" stop-color="#c6c3b0"/>
    </linearGradient>`,
    `<pattern id="${p}-escamas" width="9" height="7" patternUnits="userSpaceOnUse">
      <path d="M 0 3.5 C 2 0 7 0 9 3.5 M -4.5 7 C -2.5 3.5 2.5 3.5 4.5 7 M 4.5 7 C 6.5 3.5 11.5 3.5 13.5 7" ${trazo("rgb(23 26 51 / 0.13)", 0.6)}/>
    </pattern>`,
    `<clipPath id="${p}-tras-cabeza"><rect x="-92" y="-60" width="230" height="120"/></clipPath>`,
  ].join("");

  return { capas, defs, alturaCapa: 1.2, mmCapa: 0.2 };
}

// --- Tricolor: lomo, banda y vientre de filamentos distintos -------------

function tricolor(p) {
  const CAPAS = 24;
  const CAPA_ALETA = 11;
  const perfil = perfilElipse({
    capas: CAPAS,
    capaAleta: CAPA_ALETA,
    capasAleta: 2,
    corteCama: 0.72,
    corteLomo: 0.78,
    afilado: 2.2,
  });
  const lomo = tonosDePared(CAPAS, "#0f2c39", "#3d8299");
  const vientre = tonosDePared(CAPAS, "#646a79", "#e8eaf0");
  const banda = tonosDePared(CAPAS, "#8f96a6", "#ffffff");
  const soportes = soporteEnArbol(CAPA_ALETA, `url(#${p}-soporte)`);

  const capas = perfil.map((capa, i) => {
    const cima = i === CAPAS - 1;
    const ultimaAleta = i === CAPA_ALETA + 1;
    const color = (tonos, cara) => (cima ? `url(#${p}-${cara})` : tonos[i]);
    const piezas = [
      capa.aleta ? usarAletas(p, mezclarColor(vientre[i], "#3d8299", 0.25)) : "",
      `<use href="#${p}-cuerpo" fill="${color(vientre, "cara-vientre")}"/>`,
      `<use href="#${p}-cuerpo" fill="${color(lomo, "cara-lomo")}" clip-path="url(#${p}-lomo)"/>`,
      `<use href="#${p}-cuerpo" fill="${color(banda, "cara-banda")}" clip-path="url(#${p}-banda)"/>`,
      capa.aleta ? calorAletas(p) : "",
      calor(`${p}-cuerpo`),
      ultimaAleta ? `<path d="${RADIOS}" ${trazo("rgb(15 44 57 / 0.35)", 0.7)}/>` : "",
      cima
        ? [
            `<use href="#${p}-cuerpo" fill="url(#${p}-escamas)" clip-path="url(#${p}-lomo)"/>`,
            aletaPectoral("rgb(232 234 240 / 0.9)", "rgb(23 26 51 / 0.25)"),
            caraCabeza(capa, { ojo: "#d9dce4", iris: "#9aa0ad", linea: "rgb(15 44 57 / 0.45)" }),
          ].join("")
        : "",
    ].join("");
    // Volteado: el lomo, que es lo que lleva el color, mira a la cámara.
    return {
      sx: capa.sx,
      svg: `<g transform="scale(1 -1)">${soportes[i] ?? ""}<g transform="${escala(capa)}">${piezas}</g></g>`,
    };
  });

  // La raya entre lomo y vientre sigue el costado del pez por encima de la
  // línea media y baja en el morro y la cola, que son oscuros enteros. La
  // banda plateada va justo debajo.
  const defs = [
    defsComunes(p),
    `<clipPath id="${p}-lomo"><path d="M -170 -90 L 170 -90 L 170 6 C 80 -12 -80 -12 -170 6 Z"/></clipPath>`,
    `<clipPath id="${p}-banda"><path d="M -170 6 C -80 -12 80 -12 170 6 L 170 11 C 80 -7 -80 -7 -170 11 Z"/></clipPath>`,
    `<linearGradient id="${p}-cara-lomo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1f5263"/><stop offset="100%" stop-color="#4f97ad"/>
    </linearGradient>`,
    `<linearGradient id="${p}-cara-banda" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffffff"/><stop offset="50%" stop-color="#dfe6ee"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>`,
    `<linearGradient id="${p}-cara-vientre" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f4f5f8"/><stop offset="100%" stop-color="#b9bdc8"/>
    </linearGradient>`,
    `<linearGradient id="${p}-soporte" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#8e93a0"/><stop offset="60%" stop-color="#eceef3"/>
      <stop offset="100%" stop-color="#b3b8c4"/>
    </linearGradient>`,
    `<pattern id="${p}-escamas" width="9" height="7" patternUnits="userSpaceOnUse">
      <path d="M 0 3.5 C 2 0 7 0 9 3.5 M -4.5 7 C -2.5 3.5 2.5 3.5 4.5 7 M 4.5 7 C 6.5 3.5 11.5 3.5 13.5 7" ${trazo("rgb(255 255 255 / 0.16)", 0.6)}/>
    </pattern>`,
  ].join("");

  return { capas, defs, alturaCapa: 1.2, mmCapa: 0.2 };
}

// --- Articulado: piezas unidas por bisagras, impreso en plano -------------

// Ejes de las bisagras, del morro a la cola. Cada pieza gira sobre el eje
// que la une a la anterior, y arrastra a todas las que vienen detrás.
export const JUNTAS_ARTICULADO = [-86, -62, -38, -14, 10, 34, 58, 82, 106];

function articulado(p) {
  const CAPAS = 14;
  const HUECO = 1.6; // medio hueco entre pieza y pieza
  const tonos = tonosDePared(CAPAS, "#7d7650", "#e4ddb2");
  const limites = [-200, ...JUNTAS_ARTICULADO, 200];
  const linea = "rgb(23 26 51 / 0.22)";

  // Plano contra la cama y con un chaflán en las dos últimas capas.
  const perfil = Array.from({ length: CAPAS }, (_, i) => {
    const metido = Math.max(0, i - (CAPAS - 3)) * 1.6;
    return { sx: n2(1 - metido / LARGO), sy: n2(1 - metido / MEDIO_ALTO) };
  });

  const capas = perfil.map((capa, i) => {
    const cima = i === CAPAS - 1;
    const relleno = cima ? `url(#${p}-cara)` : tonos[i];
    const piezas = limites.slice(0, -1).map((desde, k) => {
      const hasta = limites[k + 1];
      const bisagra =
        k > 0 ? `<circle cx="${desde}" cy="0" r="4.2" fill="${mezclarColor(tonos[i], "#171a33", 0.12)}"/>` : "";
      let detalle = "";
      if (cima && k === 0) {
        detalle = caraCabeza(capa, { ojo: "#c9c194", iris: "#8a8255", linea });
      } else if (cima && k < limites.length - 2) {
        const x = desde + 5;
        detalle =
          `<path d="M ${x} -18 Q ${x + 9} 0 ${x} 18" ${trazo(linea, 1)}/>` +
          `<path d="M ${x + 9} -14 Q ${x + 17} 0 ${x + 9} 14" ${trazo("rgb(23 26 51 / 0.12)", 0.8)}/>`;
      } else if (cima) {
        detalle = `<path d="${RADIOS}" ${trazo(linea, 0.8)}/>`;
      }
      return (
        `<g data-segmento="${k}">` +
        bisagra +
        `<g clip-path="url(#${p}-pieza-${k})">` +
        `<use href="#${p}-cuerpo" fill="${relleno}"/>${usarAletas(p, relleno)}` +
        calor(`${p}-cuerpo`) +
        calorAletas(p) +
        `${detalle}</g></g>`
      );
    });
    return { sx: capa.sx, svg: `<g transform="${escala(capa)}">${piezas.join("")}</g>` };
  });

  const defs = [
    defsComunes(p),
    ...limites.slice(0, -1).map((desde, k) => {
      const izquierda = k === 0 ? desde : desde + HUECO;
      const derecha = k === limites.length - 2 ? limites[k + 1] : limites[k + 1] - HUECO;
      return `<clipPath id="${p}-pieza-${k}"><rect x="${izquierda}" y="-80" width="${derecha - izquierda}" height="160"/></clipPath>`;
    }),
    `<linearGradient id="${p}-cara" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#cfc694"/><stop offset="38%" stop-color="#faf7e9"/>
      <stop offset="62%" stop-color="#f1ecd0"/><stop offset="100%" stop-color="#d6ce9e"/>
    </linearGradient>`,
  ].join("");

  return { capas, defs, alturaCapa: 1.2, mmCapa: 0.2, juntas: JUNTAS_ARTICULADO };
}

// --- Low poly: caras planas con su propia luz ------------------------------

// Estaciones a lo largo del pez: x, borde del lomo y borde del vientre.
const ESTACIONES = [
  [-152, -2, -2],
  [-134, -13, 6],
  [-112, -21, 14],
  [-84, -26, 21],
  [-52, -28, 26],
  [-16, -28, 28],
  [22, -26, 27],
  [58, -21, 22],
  [90, -13, 14],
  [112, -6, 6],
  [122, 0, 0],
];

const ALETAS_POLI = {
  dorsal: "-8,-26 8,-52 20,-25",
  pelvica: "-30,26 -16,40 -18,27",
  anal: "26,24 40,44 50,22",
  cola: "110,-6 152,-40 132,0 152,40 110,6",
};

function lowpoly(p) {
  const CAPAS = 24;
  const CAPA_ALETA = 11;
  const soportes = soporteEnArbol(CAPA_ALETA, `url(#${p}-soporte)`);
  const contorno = [
    ...ESTACIONES.map(([x, arriba]) => `${x},${arriba}`),
    ...ESTACIONES.slice(1, -1)
      .reverse()
      .map(([x, , abajo]) => `${x},${abajo}`),
  ].join(" ");

  // El perfil de la elipse, pero recto entre unas pocas alturas: cada tramo
  // es un chaflán plano con un único tono, como la cara de un modelo low poly.
  const QUIEBROS = [-0.72, -0.36, 0, 0.42, 0.78];
  const metidoEn = (u) => MEDIO_ALTO * (1 - Math.sqrt(1 - u * u));
  const medio = CAPA_ALETA + 0.5;
  const tonosTramo = ["#4b505e", "#7a8090", "#a9aebb", "#d4d7df"];
  const perfil = Array.from({ length: CAPAS }, (_, i) => {
    const u = i < medio ? (-0.72 * (medio - i)) / medio : (0.78 * (i - medio)) / (CAPAS - 1 - medio);
    const siguiente = QUIEBROS.findIndex((q) => u < q);
    const tramo = Math.max(0, Math.min((siguiente < 0 ? QUIEBROS.length : siguiente) - 1, QUIEBROS.length - 2));
    const t = (u - QUIEBROS[tramo]) / (QUIEBROS[tramo + 1] - QUIEBROS[tramo]);
    const metido = metidoEn(QUIEBROS[tramo]) + (metidoEn(QUIEBROS[tramo + 1]) - metidoEn(QUIEBROS[tramo])) * t;
    return {
      sx: n2(1 - (metido * 2.2) / LARGO),
      sy: n2(1 - metido / MEDIO_ALTO),
      aleta: i >= CAPA_ALETA && i < CAPA_ALETA + 2,
      tono: tonosTramo[tramo],
    };
  });

  // Cara de arriba: un espinazo alzado recorre el pez de morro a cola, y
  // entre él y cada borde van dos triángulos por tramo, con la diagonal
  // alterna. Cada triángulo se ilumina según hacia dónde mira.
  const LUZ = [-0.5, 0.45, 0.74]; // desde la cámara, un poco por la izquierda
  const largoLuz = Math.hypot(...LUZ);
  const tono = (a, b, c) => {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const largo = Math.hypot(...n) || 1;
    const signo = n[2] < 0 ? -1 : 1;
    const luz = (signo * (n[0] * LUZ[0] + n[1] * LUZ[1] + n[2] * LUZ[2])) / (largo * largoLuz);
    return mezclarColor("#7d8392", "#ffffff", Math.max(0, Math.min(1, (luz - 0.3) / 0.7)));
  };
  const ultima = ESTACIONES.length - 1;
  const arriba = ESTACIONES.map(([x, y]) => [x, y, 0]);
  const abajo = ESTACIONES.map(([x, , y]) => [x, y, 0]);
  // El espinazo zigzaguea un poco en alto y en ancho para que las caras no
  // salgan todas iguales.
  const espinazo = ESTACIONES.map(([x, y1, y2], k) => [
    x,
    (y1 + y2) / 2 - 3 + (k % 2 ? 2.5 : -2.5),
    18 * Math.sin((Math.PI * k) / ultima) + (k % 2 ? 4 : -2),
  ]);
  const facetas = [];
  const triangulo = (a, b, c) => {
    if ((a[0] === b[0] && a[1] === b[1]) || (b[0] === c[0] && b[1] === c[1]) || (a[0] === c[0] && a[1] === c[1])) return;
    const color = tono(a, b, c);
    facetas.push(
      `<polygon points="${[a, b, c].map(([x, y]) => `${n2(x)},${n2(y)}`).join(" ")}" fill="${color}" stroke="${color}" stroke-width="0.4" stroke-linejoin="round"/>`,
    );
  };
  for (let k = 0; k < ultima; k += 1) {
    for (const borde of [arriba, abajo]) {
      const [e1, e2, m1, m2] = [borde[k], borde[k + 1], espinazo[k], espinazo[k + 1]];
      if (k % 2 === 0) {
        triangulo(e1, e2, m2);
        triangulo(e1, m2, m1);
      } else {
        triangulo(e1, e2, m1);
        triangulo(e2, m2, m1);
      }
    }
  }

  const capas = perfil.map((capa, i) => {
    const cima = i === CAPAS - 1;
    const aletas = Object.values(ALETAS_POLI)
      .map((puntos) => `<polygon points="${puntos}" fill="${mezclarColor(capa.tono, "#ffffff", 0.2)}"/>`)
      .join("");
    const piezas = [
      capa.aleta ? aletas : "",
      `<polygon points="${contorno}" fill="${capa.tono}"/>`,
      `<polygon class="capa__calor" points="${contorno}" fill="#e5592f" opacity="0"/>`,
      cima
        ? facetas.join("") +
          `<polygon points="-122,-9 -114,-13 -108,-8 -110,-1 -118,0 -124,-4" fill="#1b1d29"/>` +
          `<polygon points="-119,-9 -116,-10 -116,-7" fill="rgb(255 255 255 / 0.85)"/>`
        : "",
    ].join("");
    return { sx: capa.sx, svg: (soportes[i] ?? "") + `<g transform="${escala(capa)}">${piezas}</g>` };
  });

  const defs = `<linearGradient id="${p}-soporte" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7d8392"/><stop offset="60%" stop-color="#e6e8ee"/>
      <stop offset="100%" stop-color="#a9aebb"/>
    </linearGradient>`;

  return { capas, defs, alturaCapa: 1.2, mmCapa: 0.2 };
}

const CONSTRUCTORES = { natural, tricolor, articulado, lowpoly };

export function construirBoqueron(modelo, prefijo) {
  const construir = CONSTRUCTORES[modelo] ?? CONSTRUCTORES.natural;
  return { juntas: null, ...construir(prefijo) };
}
