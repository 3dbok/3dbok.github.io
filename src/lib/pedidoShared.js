export const PASOS_PEDIDO = [
  { id: "descripcion", titulo: "Cuéntanos tu idea" },
  { id: "diseno", titulo: "¿Ya tienes el diseño?" },
  { id: "tamano", titulo: "¿De qué tamaño?" },
  { id: "detalles", titulo: "Últimos detalles" },
  { id: "contacto", titulo: "¿Cómo te avisamos?" },
];

export const TAMANOS_PEDIDO = [
  { id: "xs", etiqueta: "Pequeño", nota: "Como una moneda", medida: "menos de 5 cm" },
  { id: "s", etiqueta: "Compacto", nota: "Como un móvil", medida: "5 – 15 cm" },
  { id: "m", etiqueta: "Mediano", nota: "Como un libro", medida: "15 – 30 cm" },
  { id: "l", etiqueta: "Grande", nota: "Como una mochila", medida: "más de 30 cm" },
];

export const MATERIALES_PEDIDO = [
  { id: "any", etiqueta: "Que elija el maker", nota: "Lo normal si no lo tienes claro" },
  { id: "pla", etiqueta: "PLA", nota: "Rígido y económico" },
  { id: "resin", etiqueta: "Resina", nota: "Máximo detalle, superficie lisa" },
  { id: "petg", etiqueta: "PETG", nota: "Aguanta golpes, calor y humedad" },
];

export const PRESUPUESTOS_PEDIDO = [
  "Menos de 20 €",
  "20 – 50 €",
  "50 – 100 €",
  "Aún no lo sé",
];

export const ETIQUETAS_TAMANO = Object.fromEntries(
  TAMANOS_PEDIDO.map(({ id, etiqueta, medida }) => [id, `${etiqueta} · ${medida}`]),
);

export const ETIQUETAS_MATERIAL = Object.fromEntries(
  MATERIALES_PEDIDO.map(({ id, etiqueta }) => [
    id,
    id === "any" ? "Lo elige el maker" : etiqueta,
  ]),
);

export const PEDIDO_CONFIRMACION_STORAGE_KEY = "3dbok-pedido";
export const PEDIDO_BORRADOR_STORAGE_KEY = "3dbok-pedido-borrador";
export const CONFIRMACION_TTL_MS = 30 * 60 * 1000;
export const BORRADOR_TTL_MS = 2 * 60 * 60 * 1000;
export const MAX_STL_PREVIEW_BYTES = 20 * 1024 * 1024;

export function crearIdentidadPedido() {
  const uuid = globalThis.crypto?.randomUUID?.();
  const semilla = uuid ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const sufijo = semilla.replaceAll("-", "").slice(-8).toUpperCase();

  return {
    requestId: uuid ?? semilla,
    orderId: `3DB-${sufijo}`,
  };
}
