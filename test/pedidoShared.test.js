import assert from "node:assert/strict";
import test from "node:test";

import {
  CONFIRMACION_TTL_MS,
  PATRON_REFERENCIA_PEDIDO,
  crearCamposFormspreePedido,
  crearIdentidadPedido,
  esConfirmacionPedidoValida,
  esIdentidadPedidoValida,
  mensajeErrorEnvioPedido,
} from "../src/lib/pedidoShared.js";

const ahora = 1_800_000_000_000;

const pedidoValido = {
  version: 2,
  status: "submitted",
  submittedAt: ahora,
  orderId: "3DB-A1B2C3D4",
  requestId: "123e4567-e89b-12d3-a456-426614174000",
  email: "cliente@example.com",
  description: "Una descripción suficientemente detallada.",
  hasDesign: true,
  stlSelected: true,
  size: "m",
  material: "pla",
  deadline: "",
  budget: "",
  makerNombre: "Maker de prueba",
  productName: "",
};

test("crearIdentidadPedido genera una identidad válida", () => {
  const identidad = crearIdentidadPedido();

  assert.equal(esIdentidadPedidoValida(identidad), true);
  assert.match(identidad.orderId, PATRON_REFERENCIA_PEDIDO);
});

test("esIdentidadPedidoValida rechaza valores incompletos o manipulados", () => {
  assert.equal(esIdentidadPedidoValida(), false);
  assert.equal(esIdentidadPedidoValida({ requestId: "corto", orderId: "3DB-A1B2C3D4" }), false);
  assert.equal(
    esIdentidadPedidoValida({ requestId: "        ", orderId: "3DB-A1B2C3D4" }),
    false,
  );
  assert.equal(
    esIdentidadPedidoValida({ requestId: pedidoValido.requestId, orderId: "PEDIDO-123" }),
    false,
  );
});

test("esConfirmacionPedidoValida acepta solo registros completos dentro del TTL", () => {
  assert.equal(esConfirmacionPedidoValida(pedidoValido, ahora), true);
  assert.equal(
    esConfirmacionPedidoValida(
      { ...pedidoValido, submittedAt: ahora - CONFIRMACION_TTL_MS },
      ahora,
    ),
    true,
  );
  assert.equal(
    esConfirmacionPedidoValida(
      { ...pedidoValido, submittedAt: ahora - CONFIRMACION_TTL_MS - 1 },
      ahora,
    ),
    false,
  );
  assert.equal(
    esConfirmacionPedidoValida({ ...pedidoValido, submittedAt: ahora + 1 }, ahora),
    false,
  );
  assert.equal(esConfirmacionPedidoValida({ ...pedidoValido, email: "" }, ahora), false);
  assert.equal(esConfirmacionPedidoValida({ ...pedidoValido, email: "sin-arroba" }, ahora), false);
  assert.equal(esConfirmacionPedidoValida({ ...pedidoValido, size: "gigante" }, ahora), false);
  assert.equal(esConfirmacionPedidoValida({ ...pedidoValido, requestId: "" }, ahora), false);
  assert.equal(esConfirmacionPedidoValida({ ...pedidoValido, productName: null }, ahora), false);
});

test("crearCamposFormspreePedido envía el indicador STL pero nunca el archivo", () => {
  const estadoFormulario = {
    orderId: pedidoValido.orderId,
    requestId: pedidoValido.requestId,
    name: "  Ana  ",
    email: "  ana@example.com  ",
    phone: "",
    description: "  Necesito una pieza de repuesto para una bisagra.  ",
    hasDesign: true,
    size: "s",
    material: "any",
    color: "",
    deadline: "",
    budget: "",
    makerId: "recommended",
    productId: "",
    productName: "",
    designFileObject: { contenidoQueNoDebeSalir: "bytes STL" },
  };

  const campos = crearCamposFormspreePedido(estadoFormulario, "Lo elegimos nosotros", true);

  assert.equal(campos.tipo, "pedido_cliente");
  assert.equal(campos.nombre, "Ana");
  assert.equal(campos.email, "ana@example.com");
  assert.match(campos.stlSeleccionado, /^Sí\./);
  assert.equal(Object.hasOwn(campos, "designFileObject"), false);
  assert.equal(JSON.stringify(campos).includes("bytes STL"), false);
  assert.equal(Object.values(campos).every((valor) => typeof valor === "string"), true);
});

test("crearCamposFormspreePedido distingue solicitudes sin STL", () => {
  const campos = crearCamposFormspreePedido(
    {
      orderId: pedidoValido.orderId,
      requestId: pedidoValido.requestId,
      name: "Ana",
      email: "ana@example.com",
      phone: "+34 600 000 000",
      description: pedidoValido.description,
      hasDesign: false,
      size: "m",
      material: "pla",
      color: "negro",
      deadline: "2026-12-01",
      budget: "20 – 50 €",
      makerId: "ignacio_printing",
      productId: "prod-001",
      productName: "Pieza de prueba",
    },
    "Ignacio — Málaga",
    false,
  );

  assert.equal(campos.stlSeleccionado, "No");
  assert.equal(campos.tieneDiseno, "No, necesita ayuda con el diseño");
  assert.equal(campos.productoId, "prod-001");
});

test("mensajeErrorEnvioPedido devuelve mensajes controlados por tipo de fallo", () => {
  assert.match(mensajeErrorEnvioPedido({ status: 429 }), /límite de solicitudes/);
  assert.match(mensajeErrorEnvioPedido({ status: 422 }), /validar la solicitud/);
  assert.match(mensajeErrorEnvioPedido(), /No hemos podido enviar/);
  assert.match(
    mensajeErrorEnvioPedido({ abortado: true, referencia: pedidoValido.orderId }),
    new RegExp(pedidoValido.orderId),
  );
});
