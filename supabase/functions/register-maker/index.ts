import { withSupabase } from "npm:@supabase/server@1";
import { Redis } from "npm:@upstash/redis";
import { Ratelimit } from "npm:@upstash/ratelimit";
import { isIP } from "node:net";
import {
  MAX_REQUEST_BYTES,
  readBodyWithLimit,
  RequestTooLargeError,
} from "./bodyLimit.js";

const allowedMaterials = [
  "PLA", "PETG", "ABS", "Resina", "TPU", "Nylon"
];

const allowedExperiences = [
  "Menos de 6 meses",
  "Entre 6 meses y 2 años",
  "Más de 2 años",
];

const allowedNozzles = [
  "0.2 mm", "0.4 mm", "0.6 mm", "0.8 mm"
];

const reply = (message: string, status = 200) =>
  Response.json({ message }, { status });


// Configuración de Redis
const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
});

// Máximo 10 intentos cada 15 minutos
const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(10, "15 m"),
  analytics: false,
  prefix: "3dbok:maker:ratelimit",
});

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
    byte => byte.toString(16).padStart(2, "0"),
  ).join("");
}

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return reply("Método no permitido", 405);
    }

    if (Number(req.headers.get("content-length") || 0) > MAX_REQUEST_BYTES) {
      return reply("Solicitud demasiado grande", 413);
    }

    let body: Uint8Array;

    try {
      body = await readBodyWithLimit(req, MAX_REQUEST_BYTES);
    } catch (error) {
      if (error instanceof RequestTooLargeError) {
        return reply("Solicitud demasiado grande", 413);
      }

      return reply("No se pudo leer el formulario", 400);
    }

    let data: FormData;

    try {
      const boundedRequest = new Request(req.url, {
        method: "POST",
        headers: {
          "content-type": req.headers.get("content-type") || "",
        },
        body,
      });


      // -------------------------------------
      // RATE LIMITING CON REDIS
      // -------------------------------------

      const ip = req.headers.get("cf-connecting-ip")?.trim();

      if (!ip || isIP(ip) === 0) {
        return reply(
          "No se pudo verificar el origen de la solicitud",
          503,
        );
      }

      try {
        const identifier = await hashIp(ip);

        const { success, reset } =
          await rateLimiter.limit(identifier);

        if (!success) {
          const retryAfter = Math.max(
            1,
            Math.ceil((reset - Date.now()) / 1000),
          );

          return Response.json(
            {
              message:
                "Demasiados intentos. Inténtalo más tarde.",
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

        return reply(
          "Servicio temporalmente no disponible",
          503,
        );
      }

      // -------------------------------------
      // FIN DEL RATE LIMITING
      // -------------------------------------

      data = await boundedRequest.formData();
    } catch {
      return reply("Formulario inválido", 400);
    }

    const value = (key: string) => {
      const field = data.get(key);
      return typeof field === "string" ? field.trim() : "";
    };

    const name = value("name");
    const city = value("city");
    const email = value("email").toLowerCase();
    const printer_model = value("printerModel");
    const experience = value("experience");

    const split = (key: string) =>
      value(key).split(",").map(x => x.trim()).filter(Boolean);

    const materials = split("materials");
    const nozzle_sizes = split("nozzleSizes");

    let colors: Record<string, string[]>;

    try {
      colors = JSON.parse(value("colorsJson"));
    } catch {
      return reply("Colores inválidos", 400);
    }

    const validColors =
      colors !== null &&
      typeof colors === "object" &&
      !Array.isArray(colors) &&
      materials.every(material =>
        Array.isArray(colors[material]) &&
        colors[material].length > 0 &&
        colors[material].length <= 30 &&
        colors[material].every(
          color =>
            typeof color === "string" &&
            color.trim().length > 0 &&
            color.length <= 80
        )
      );

    const valid =
      name.length > 0 && name.length <= 120 &&
      city.length > 0 && city.length <= 120 &&
      printer_model.length > 0 && printer_model.length <= 180 &&
      email.length <= 254 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
      allowedExperiences.includes(experience) &&
      materials.length > 0 &&
      materials.every(m => allowedMaterials.includes(m)) &&
      nozzle_sizes.every(n => allowedNozzles.includes(n)) &&
      (
        materials.every(m => m === "Resina") ||
        nozzle_sizes.length > 0
      ) &&
      validColors &&
      value("colorsJson").length <= 5000;

    if (!valid) {
      return reply("Datos incompletos o inválidos", 422);
    }

    // Verificación antibots
    const token = value("cf-turnstile-response");
    const secret = Deno.env.get("TURNSTILE_SECRET_KEY");

    if (!token || !secret) {
      return reply("Verificación de seguridad no disponible", 403);
    }

    let verified = false;

    try {
      const response = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            secret,
            response: token,
          }),
        }
      );

      if (!response.ok) {
        return reply("Error de verificación", 503);
      }

      const result = await response.json();

      verified =
        result.success === true &&
        ["3dbok.com", "www.3dbok.com"].includes(result.hostname);
    } catch {
      return reply("Error de verificación", 503);
    }

    if (!verified) {
      return reply("Verificación de seguridad fallida", 403);
    }

    // Registro en la base de datos
    const { error } = await ctx.supabaseAdmin
      .from("maker_applications")
      .insert({
        name,
        email,
        city,
        printer_model,
        materials,
        nozzle_sizes,
        experience,
        colors,
      });

    if (error) {
      // No revelar públicamente qué emails están registrados
      if (error.code === "23505") {
        return reply("Solicitud recibida");
      }

      console.error("Error al guardar maker:", error.code);
      return reply("No se pudo guardar el registro", 500);
    }

    return reply("Registro recibido correctamente");
  }),
};
