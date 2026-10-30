// Ayudas para dibujar piezas impresas como sólidos en SVG: cada capa es la
// misma silueta desplazada hacia arriba, y lo que se ve de cada una es solo su
// borde. Si cada capa lleva su propio tono (más oscuro abajo, más claro arriba)
// y ninguna lleva contorno, el ojo lee una pared continua y no un taco de folios.

const aRgb = (hex) => {
  const limpio = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(limpio.slice(i, i + 2), 16));
};

// Mezcla lineal entre dos colores hex. `t` va de 0 (a) a 1 (b).
export function mezclarColor(a, b, t) {
  const [r1, g1, b1] = aRgb(a);
  const [r2, g2, b2] = aRgb(b);
  const canal = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${canal(r1, r2)}${canal(g1, g2)}${canal(b1, b2)}`;
}

// Tono de la pared de cada capa: oscuro contra la bancada, claro en el
// borde superior, con la curva suave del lomo de una pieza redondeada.
export function tonosDePared(total, base, cima) {
  return Array.from({ length: total }, (_, i) =>
    mezclarColor(base, cima, Math.pow(i / Math.max(total - 1, 1), 0.8)),
  );
}
