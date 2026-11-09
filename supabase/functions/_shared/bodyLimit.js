export const MAX_REQUEST_BYTES = 20_000;

export class RequestTooLargeError extends Error {}

/**
 * Lee el cuerpo sin acumular más bytes de los permitidos.
 * `Content-Length` solo puede usarse como atajo: el límite real lo impone
 * este contador sobre los chunks recibidos.
 *
 * @param {Request} req
 * @param {number} limit
 * @returns {Promise<Uint8Array>}
 */
export const readBodyWithLimit = async (req, limit) => {
  if (!req.body) return new Uint8Array();

  const reader = req.body.getReader();
  const chunks = [];
  let receivedBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      receivedBytes += value.byteLength;

      if (receivedBytes > limit) {
        try {
          await reader.cancel("Solicitud demasiado grande");
        } catch {
          // La respuesta 413 no debe depender de que la cancelación tenga éxito.
        }

        throw new RequestTooLargeError();
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(receivedBytes);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return body;
};
