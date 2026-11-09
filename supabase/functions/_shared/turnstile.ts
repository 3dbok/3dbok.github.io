// Verificación de Cloudflare Turnstile compartida por las funciones de makers.
// Devuelve null si el envío es válido, o la respuesta de error que hay que dar.

const allowedHostnames = ["3dbok.com", "www.3dbok.com"];

const reply = (message: string, status: number) =>
  Response.json({ message }, { status });

export async function verifyTurnstile(token: string): Promise<Response | null> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");

  if (!token || !secret) {
    return reply("Verificación de seguridad no disponible", 403);
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, response: token }),
      },
    );

    if (!response.ok) {
      return reply("Error de verificación", 503);
    }

    const result = await response.json();
    const verified =
      result.success === true && allowedHostnames.includes(result.hostname);

    return verified ? null : reply("Verificación de seguridad fallida", 403);
  } catch {
    return reply("Error de verificación", 503);
  }
}
