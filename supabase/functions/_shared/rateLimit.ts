// Límite de envíos por IP con Redis (Upstash), compartido por las funciones de
// makers. La IP no se guarda: se usa un HMAC con MAKER_RATE_LIMIT_PEPPER.
import { Redis } from "npm:@upstash/redis";
import { Ratelimit } from "npm:@upstash/ratelimit";
import { isIP } from "node:net";

const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
});

const reply = (message: string, status: number) =>
  Response.json({ message }, { status });

// Máximo 10 intentos cada 15 minutos. Cada función usa su propio prefijo para
// que los envíos de un formulario no cuenten para el otro.
export function createRateLimiter(prefix: string): Ratelimit {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(10, "15 m"),
    analytics: false,
    prefix,
  });
}

// Crear identificador seudónimo para una IP
async function hashIp(ip: string): Promise<string> {
  const secret = Deno.env.get("MAKER_RATE_LIMIT_PEPPER");

  if (!secret) {
    throw new Error("Falta MAKER_RATE_LIMIT_PEPPER");
  }

  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(ip),
  );

  return Array.from(
    new Uint8Array(signature),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

// Devuelve null si la IP aún puede enviar, o la respuesta de error que hay que dar.
export async function checkRateLimit(
  req: Request,
  rateLimiter: Ratelimit,
): Promise<Response | null> {
  const ip = req.headers.get("cf-connecting-ip")?.trim();

  if (!ip || isIP(ip) === 0) {
    return reply("No se pudo verificar el origen de la solicitud", 503);
  }

  try {
    const identifier = await hashIp(ip);
    const { success, reset } = await rateLimiter.limit(identifier);

    if (!success) {
      const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));

      return Response.json(
        {
          message: "Demasiados intentos. Inténtalo más tarde.",
          retryAfterSeconds: retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "Cache-Control": "no-store",
          },
        },
      );
    }
  } catch (error) {
    console.error(
      "Error al comprobar el rate limit:",
      error instanceof Error ? error.name : "Unknown",
    );

    return reply("Servicio temporalmente no disponible", 503);
  }

  return null;
}
