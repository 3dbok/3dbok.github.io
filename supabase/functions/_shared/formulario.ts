// Lectura protegida de los formularios de makers: límite de tamaño real (no
// solo el Content-Length), límite de envíos por IP y, por último, FormData.
// Devuelve { data } o { response } con el error que hay que dar.
import type { Ratelimit } from "npm:@upstash/ratelimit";

import {
  MAX_REQUEST_BYTES,
  readBodyWithLimit,
  RequestTooLargeError,
} from "./bodyLimit.js";
import { checkRateLimit } from "./rateLimit.ts";

const reply = (message: string, status: number) =>
  Response.json({ message }, { status });

export async function readProtectedForm(
  req: Request,
  rateLimiter: Ratelimit,
): Promise<{ data: FormData } | { response: Response }> {
  if (Number(req.headers.get("content-length") || 0) > MAX_REQUEST_BYTES) {
    return { response: reply("Solicitud demasiado grande", 413) };
  }

  let body: Uint8Array;

  try {
    body = await readBodyWithLimit(req, MAX_REQUEST_BYTES);
  } catch (error) {
    if (error instanceof RequestTooLargeError) {
      return { response: reply("Solicitud demasiado grande", 413) };
    }

    return { response: reply("No se pudo leer el formulario", 400) };
  }

  const limited = await checkRateLimit(req, rateLimiter);
  if (limited) return { response: limited };

  try {
    const boundedRequest = new Request(req.url, {
      method: "POST",
      headers: {
        "content-type": req.headers.get("content-type") || "",
      },
      body,
    });

    return { data: await boundedRequest.formData() };
  } catch {
    return { response: reply("Formulario inválido", 400) };
  }
}
