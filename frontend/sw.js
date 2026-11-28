// Service worker de SIGEPA: permite instalar el sitio como app y consultar sin internet
// las páginas y recetas que ya se visitaron (útil en comunidades con conexión intermitente).
//
// Mantenimiento: cambia VERSION en cada despliegue que modifique archivos del front;
// así los navegadores descartan la copia anterior.
const VERSION = "sigepa-2026-11-27b";
const BASE = [
  "/", "/index.html", "/recetas.html", "/receta.html", "/temporadas.html", "/sin-conexion.html",
  "/css/styles.css", "/css/fuentes.css", "/assets/img/logo-sigepa.png", "/assets/img/icono-192.png",
  "/vendor/leaflet/leaflet.css", "/vendor/leaflet/leaflet.js", "/vendor/topojson-client.min.js",
  "/assets/mapa/estados.json",
];
const FOTOS_EXTERNAS = /^https:\/\/upload\.wikimedia\.org\//;
const MAX_FOTOS = 150;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((claves) => Promise.all(claves.filter((k) => k !== VERSION && k !== `${VERSION}-fotos`).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function redPrimero(req) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const guardada = await cache.match(req, { ignoreSearch: req.mode === "navigate" });
    if (guardada) return guardada;
    if (req.mode === "navigate") return cache.match("/sin-conexion.html");
    return new Response(JSON.stringify({ message: "Sin conexión. Esta información no se ha guardado en el dispositivo." }),
      { status: 503, headers: { "Content-Type": "application/json" } });
  }
}

async function cacheConActualizacion(req) {
  const cache = await caches.open(VERSION);
  const guardada = await cache.match(req);
  const red = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => guardada);
  return guardada || red;
}

async function fotoExterna(req) {
  const cache = await caches.open(`${VERSION}-fotos`);
  const guardada = await cache.match(req);
  if (guardada) return guardada;
  try {
    // Wikimedia permite CORS, así que se pide en modo "cors" para conocer el estado real de la respuesta
    // y guardar solo las fotos que llegaron bien (antes se guardaban también los errores).
    const res = await fetch(req.url, { mode: "cors", credentials: "omit", referrerPolicy: "strict-origin-when-cross-origin" });
    if (res.ok) {
      cache.put(req, res.clone());
      cache.keys().then((k) => k.length > MAX_FOTOS && cache.delete(k[0]));
    }
    return res;
  } catch {
    return fetch(req).catch(() => Response.error());
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (FOTOS_EXTERNAS.test(req.url)) { e.respondWith(fotoExterna(req)); return; }
  if (url.origin !== self.location.origin) return; // mosaicos de mapas y otros: directo a la red
  if (url.pathname.startsWith("/api/auth") || url.pathname.startsWith("/api/salud")) return;
  if (req.mode === "navigate" || url.pathname.startsWith("/api/")) { e.respondWith(redPrimero(req)); return; }
  e.respondWith(cacheConActualizacion(req));
});
