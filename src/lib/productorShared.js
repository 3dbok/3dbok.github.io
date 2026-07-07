// Fuente única de verdad para todo lo relacionado con "productor" que
// se repite en más de una página (la ficha individual y el directorio).
// Si añades un material nuevo, solo hace falta tocarlo aquí.

export const MATERIALES = {
  PLA: { label: "PLA", color: "var(--mat-pla)" },
  PETG: { label: "PETG", color: "var(--mat-petg)" },
  ABS: { label: "ABS", color: "var(--mat-abs)" },
  TPU: { label: "TPU", color: "var(--mat-tpu)" },
  RESINA: { label: "Resina", color: "var(--mat-resina)" },
  NYLON: { label: "Nylon", color: "var(--mat-nylon)" },
};

export function estrellas(valor) {
  const llenas = Math.round(valor);
  return "★".repeat(llenas) + "☆".repeat(5 - llenas);
}

// Devuelve la media y el nº de reseñas aprobadas de un productor.
// { media: null, total: 0 } si todavía no tiene ninguna.
export function calcularMediaValoracion(productorId, resenas) {
  const aprobadas = resenas.filter((r) => r.productorId === productorId && r.aprobada);
  if (aprobadas.length === 0) return { media: null, total: 0 };
  const suma = aprobadas.reduce((acc, r) => acc + r.valoracion, 0);
  return { media: suma / aprobadas.length, total: aprobadas.length };
}
