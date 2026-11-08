import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_REQUEST_BYTES,
  readBodyWithLimit,
  RequestTooLargeError,
} from "../supabase/functions/register-maker/bodyLimit.js";

const crearSolicitud = (tamanos, headers = {}) => {
  const body = new ReadableStream({
    start(controller) {
      for (const tamano of tamanos) {
        controller.enqueue(new Uint8Array(tamano));
      }

      controller.close();
    },
  });

  return new Request("https://3dbok.com/register-maker", {
    method: "POST",
    headers,
    body,
    duplex: "half",
  });
};

test("readBodyWithLimit admite un cuerpo que alcanza exactamente el límite", async () => {
  const req = crearSolicitud([8_000, 12_000]);

  const body = await readBodyWithLimit(req, MAX_REQUEST_BYTES);

  assert.equal(body.byteLength, MAX_REQUEST_BYTES);
});

test("readBodyWithLimit rechaza un cuerpo grande sin Content-Length", async () => {
  const req = crearSolicitud([10_000, 10_001]);

  assert.equal(req.headers.has("content-length"), false);
  await assert.rejects(
    readBodyWithLimit(req, MAX_REQUEST_BYTES),
    RequestTooLargeError,
  );
});

test("readBodyWithLimit cuenta los bytes aunque Content-Length sea menor", async () => {
  const req = crearSolicitud([19_000, 1_001], { "content-length": "100" });

  await assert.rejects(
    readBodyWithLimit(req, MAX_REQUEST_BYTES),
    RequestTooLargeError,
  );
});
