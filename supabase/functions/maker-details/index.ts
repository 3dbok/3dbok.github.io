// Segundo formulario del alta de makers (/maker/equipo): impresoras (marca
// y modelo, puede haber varias), si imprime en multicolor, materiales,
// boquillas y colores. Completa la solicitud que el maker creó con
// register-maker, localizándola por su email.
import { withSupabase } from "npm:@supabase/server@1";

import { normalizeText } from "../_shared/texto.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";

// Copias de MATERIALES y BOQUILLAS en src/lib/makerShared.js.
const allowedMaterials = ["PLA", "PETG", "ABS", "Resina", "TPU", "Nylon"];
const allowedNozzles = ["0.2 mm", "0.4 mm", "0.6 mm", "0.8 mm"];

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

    const split = (key: string) =>
      value(key).split(",").map((x) => x.trim()).filter(Boolean);

    const email = value("email").toLowerCase();
    const materials = split("materials");
    const multicolor = value("multicolor");

    // Impresoras: [{ marca, modelo }], elegidas del catálogo o escritas a mano.
    let rawPrinters: unknown;

    try {
      rawPrinters = JSON.parse(value("printersJson"));
    } catch {
      return reply("Impresoras inválidas", 400);
    }

    const validPrinters =
      Array.isArray(rawPrinters) &&
      rawPrinters.length > 0 &&
      rawPrinters.length <= 10 &&
      rawPrinters.every(
        (printer) =>
          printer !== null &&
          typeof printer === "object" &&
          typeof printer.marca === "string" &&
          typeof printer.modelo === "string" &&
          printer.marca.trim().length > 0 && printer.marca.length <= 60 &&
          printer.modelo.trim().length > 0 && printer.modelo.length <= 80
      );

    if (!validPrinters) {
      return reply("Datos incompletos o inválidos", 422);
    }

    const printers = (rawPrinters as { marca: string; modelo: string }[]).map(
      ({ marca, modelo }) => ({
        marca: normalizeText(marca),
        modelo: normalizeText(modelo),
      }),
    );
    const printer_model = printers
      .map(({ marca, modelo }) => `${marca} ${modelo}`)
      .join(", ");
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
      materials.every((material) =>
        Array.isArray(colors[material]) &&
        colors[material].length > 0 &&
        colors[material].length <= 30 &&
        colors[material].every(
          (color) =>
            typeof color === "string" &&
            color.trim().length > 0 &&
            color.length <= 80
        )
      );

    const valid =
      email.length <= 254 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
      ["true", "false"].includes(multicolor) &&
      materials.length > 0 &&
      materials.every((m) => allowedMaterials.includes(m)) &&
      nozzle_sizes.every((n) => allowedNozzles.includes(n)) &&
      (
        materials.every((m) => m === "Resina") ||
        nozzle_sizes.length > 0
      ) &&
      validColors &&
      value("colorsJson").length <= 5000;

    if (!valid) {
      return reply("Datos incompletos o inválidos", 422);
    }

    const normalizedColors = Object.fromEntries(
      materials.map((material) => [material, colors[material].map(normalizeText)]),
    );

    // Verificación antibots
    const rejected = await verifyTurnstile(value("cf-turnstile-response"));
    if (rejected) return rejected;

    const { data: updated, error } = await ctx.supabaseAdmin
      .from("maker_applications")
      .update({
        printer_model,
        printers,
        multicolor: multicolor === "true",
        materials,
        nozzle_sizes,
        colors: normalizedColors,
        details_submitted_at: new Date().toISOString(),
      })
      .eq("email", email)
      .select("id");

    if (error) {
      console.error("Error al guardar el equipo del maker:", error.code);
      return reply("No se pudo guardar el registro", 500);
    }

    // Igual que en register-maker, no se revela si un email está dado de alta:
    // se responde lo mismo y queda en los registros para revisarlo a mano.
    if (!updated?.length) {
      console.warn("Datos de equipo sin alta previa para ese email");
    }

    return reply("Datos recibidos correctamente");
  }),
};
