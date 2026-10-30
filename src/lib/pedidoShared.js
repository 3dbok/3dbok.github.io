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
export const PATRON_REFERENCIA_PEDIDO = /^3DB-[A-Z0-9]{8}$/;
const PATRON_REQUEST_ID = /^(?:[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}|\d{10,}-[a-z0-9]+)$/i;
const PATRON_EMAIL_BASICO = /^[^\s@]+@[^\s@]+$/;

export function esIdentidadPedidoValida({ requestId, orderId } = {}) {
  return (
    typeof requestId === "string" &&
    requestId.length <= 128 &&
    PATRON_REQUEST_ID.test(requestId) &&
    typeof orderId === "string" &&
    PATRON_REFERENCIA_PEDIDO.test(orderId)
  );
}

export function esConfirmacionPedidoValida(pedido, ahora = Date.now()) {
  if (!pedido || typeof pedido !== "object") return false;

  return (
    pedido.version === 2 &&
    pedido.status === "submitted" &&
    esIdentidadPedidoValida(pedido) &&
    Number.isFinite(pedido.submittedAt) &&
    pedido.submittedAt <= ahora &&
    ahora - pedido.submittedAt <= CONFIRMACION_TTL_MS &&
    typeof pedido.email === "string" &&
    pedido.email.length <= 254 &&
    PATRON_EMAIL_BASICO.test(pedido.email) &&
    typeof pedido.description === "string" &&
    pedido.description.trim().length >= 15 &&
    pedido.description.trim().length <= 2000 &&
    typeof pedido.hasDesign === "boolean" &&
    typeof pedido.stlSelected === "boolean" &&
    TAMANOS_PEDIDO.some(({ id }) => id === pedido.size) &&
    MATERIALES_PEDIDO.some(({ id }) => id === pedido.material) &&
    typeof pedido.makerNombre === "string" &&
    pedido.makerNombre.trim().length > 0 &&
    typeof pedido.deadline === "string" &&
    typeof pedido.budget === "string" &&
    typeof pedido.productName === "string"
  );
}

export function crearCamposFormspreePedido(pedido, makerNombre, stlSelected) {
  return {
    tipo: "pedido_cliente",
    _subject: `Nueva solicitud ${pedido.orderId}`,
    referencia: pedido.orderId,
    requestId: pedido.requestId,
    nombre: pedido.name.trim(),
    email: pedido.email.trim(),
    telefono: pedido.phone.trim() || "No indicado",
    descripcion: pedido.description.trim(),
    tieneDiseno: pedido.hasDesign ? "Sí" : "No, necesita ayuda con el diseño",
    stlSeleccionado: stlSelected
      ? "Sí. No se ha enviado ni guardado; solicitar al cliente por email."
      : "No",
    tamano: pedido.size,
    material: pedido.material,
    color: pedido.color.trim() || "Sin preferencia",
    fechaDeseada: pedido.deadline || "No indicada",
    presupuesto: pedido.budget || "No indicado",
    makerId: pedido.makerId,
    maker: makerNombre,
    productoId: pedido.productId || "No procede",
    producto: pedido.productName || "No procede",
  };
}

export function mensajeErrorEnvioPedido({ status, abortado = false, referencia = "" } = {}) {
  if (abortado) {
    const sufijo = referencia ? ` indicando la referencia ${referencia}` : "";
    return `El envío está tardando demasiado y no podemos confirmar si llegó. Espera un momento y reinténtalo una sola vez, o escríbenos a contacto@3dbok.com${sufijo}.`;
  }
  if (status === 429) {
    return "Hemos alcanzado temporalmente el límite de solicitudes. Escríbenos a contacto@3dbok.com o inténtalo más tarde.";
  }
  if (status === 400 || status === 422) {
    return "No hemos podido validar la solicitud. Revisa los datos e inténtalo de nuevo.";
  }
  return "No hemos podido enviar la solicitud. Tus respuestas siguen aquí para que puedas reintentarlo.";
}

export function crearIdentidadPedido() {
  const uuid = globalThis.crypto?.randomUUID?.();
  const semilla =
    uuid ?? `${Date.now()}-${Math.random().toString(36).slice(2).padEnd(8, "0")}`;
  const sufijo = semilla.replaceAll("-", "").slice(-8).toUpperCase();

  return {
    requestId: uuid ?? semilla,
    orderId: `3DB-${sufijo}`,
  };
}
