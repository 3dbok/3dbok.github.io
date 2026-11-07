import { withSupabase } from "npm:@supabase/server@1";

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