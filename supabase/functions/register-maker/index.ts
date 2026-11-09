// Primer formulario del alta de makers (/maker): solo datos de contacto y
// experiencia. El equipo (impresoras, materiales, colores) llega después, por
// la función maker-details, con el enlace que mandamos al revisar el alta.
import { withSupabase } from "npm:@supabase/server@1";

import { normalizeText } from "../_shared/texto.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";

// Copia de EXPERIENCIAS en src/lib/makerShared.js.
const allowedExperiences = [
  "Menos de 6 meses",
  "Entre 6 meses y 2 años",
  "Más de 2 años",
];

// Códigos postales de España: provincias 01 a 52 y tres cifras más.
const postalCodePattern = /^(?:0[1-9]|[1-4]\d|5[0-2])\d{3}$/;

const reply = (message: string, status = 200) =>
  Response.json({ message }, { status });

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return reply("Método no permitido", 405);
    }

    if (Number(req.headers.get("content-length") || 0) > 20000) {
      return reply("Solicitud demasiado grande", 413);
    }

    let data: FormData;

    try {
      data = await req.formData();
    } catch {
      return reply("Formulario inválido", 400);
    }

    const value = (key: string) => {
      const field = data.get(key);
      return typeof field === "string" ? field.trim() : "";
    };

    const name = normalizeText(value("name"));
    const last_name = normalizeText(value("lastName"));
    const postal_code = value("postalCode");
    const city = normalizeText(value("city"));
    const email = value("email").toLowerCase();
    const experience = value("experience");

    const valid =
      name.length > 0 && name.length <= 80 &&
      last_name.length > 0 && last_name.length <= 120 &&
      postalCodePattern.test(postal_code) &&
      city.length > 0 && city.length <= 120 &&
      email.length <= 254 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
      allowedExperiences.includes(experience);

    if (!valid) {
      return reply("Datos incompletos o inválidos", 422);
    }

    // Verificación antibots
    const rejected = await verifyTurnstile(value("cf-turnstile-response"));
    if (rejected) return rejected;

    // Registro en la base de datos
    const { error } = await ctx.supabaseAdmin
      .from("maker_applications")
      .insert({
        name,
        last_name,
        postal_code,
        city,
        email,
        experience,
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
