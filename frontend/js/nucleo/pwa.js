// Registro del service worker (sw.js), aviso de "sin conexión" y botón para instalar la app.
let avisoInstalar = null;

export function registrarPwa() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("/sw.js").catch(() => { /* el sitio funciona igual sin él */ });
  }
  const pintarConexion = () => {
    let aviso = document.querySelector("[data-sin-conexion]");
    if (navigator.onLine) { aviso?.remove(); return; }
    if (aviso) return;
    document.querySelector(".nav")?.insertAdjacentHTML("afterend",
      `<div class="aviso-conexion" role="status" data-sin-conexion>Estás sin conexión. Puedes ver las páginas y recetas que ya abriste; lo nuevo se cargará al volver la señal.</div>`);
  };
  window.addEventListener("online", pintarConexion);
  window.addEventListener("offline", pintarConexion);
  pintarConexion();

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    avisoInstalar = e;
    document.querySelectorAll("[data-instalar]").forEach((b) => { b.hidden = false; });
  });
  document.addEventListener("click", async (e) => {
    if (!e.target.closest("[data-instalar]") || !avisoInstalar) return;
    avisoInstalar.prompt();
    await avisoInstalar.userChoice;
    avisoInstalar = null;
    document.querySelectorAll("[data-instalar]").forEach((b) => { b.hidden = true; });
  });
}
