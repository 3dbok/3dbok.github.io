// Cloudflare Turnstile en los formularios de makers. El script de Cloudflare se
// carga con render=explicit, así que cada página monta el widget cuando su
// contenedor está visible. Los tokens son de un solo uso: tras un envío fallido
// hay que reiniciar el widget para que el siguiente intento lleve uno nuevo.

export function prepararTurnstile(contenedor, script) {
  let montado = false;
  const api = () => Reflect.get(window, "turnstile");

  const montar = () => {
    if (!(contenedor instanceof HTMLElement) || montado) return;
    if (contenedor.closest("[hidden]")) return;

    const sitekey = contenedor.dataset.sitekey;
    const turnstile = api();
    if (!sitekey || !turnstile?.render) return;

    turnstile.render(contenedor, { sitekey });
    montado = true;
  };

  const reiniciar = () => {
    if (montado) api()?.reset?.(contenedor);
  };

  montar();
  script?.addEventListener("load", montar, { once: true });

  return { montar, reiniciar };
}
