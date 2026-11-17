// Asistente de SIGEPA: chat flotante en todas las pantallas.
// Pregunta a /api/asistente y muestra la respuesta con tarjetas de recetas, lista de compras,
// fichas de ingredientes y un mapa pequeño (pines de recetas y estados resaltados).
import { api, esc } from "./api.js";
import { icon } from "./icons.js";

const CLAVE = "sigepa.asistente";
const SUGERENCIAS = [
  "Tengo 200 pesos, ¿qué puedo cocinar para 4 personas?",
  "¿Dónde se recolecta la hierba santa?",
  "¿Qué se recolecta en Oaxaca en esta temporada?",
  "Recetas rápidas de Yucatán",
];

let estado = { abierto: false, mensajes: [] };
try { estado = { ...estado, ...JSON.parse(sessionStorage.getItem(CLAVE) || "{}") }; } catch { /* nada guardado */ }
const guardar = () => {
  estado.mensajes = estado.mensajes.slice(-20);
  try { sessionStorage.setItem(CLAVE, JSON.stringify(estado)); } catch { /* sin almacenamiento */ }
};

/* ---------- Leaflet bajo demanda (no todas las pantallas lo cargan) ---------- */
let leafletListo = null;
function cargarLeaflet() {
  if (window.L && window.topojson) return Promise.resolve();
  if (leafletListo) return leafletListo;
  const script = (src) => new Promise((ok, mal) => {
    const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = mal; document.head.append(s);
  });
  if (!document.querySelector('link[href*="leaflet.css"]')) {
    document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="vendor/leaflet/leaflet.css">');
  }
  leafletListo = (window.L ? Promise.resolve() : script("vendor/leaflet/leaflet.js"))
    .then(() => (window.topojson ? null : script("vendor/topojson-client.min.js")));
  return leafletListo;
}

/* ---------- Texto con **negritas** y viñetas "- " ---------- */
function formato(texto) {
  const lineas = esc(texto).split("\n");
  let html = ""; let enLista = false;
  for (const l of lineas) {
    const conNegritas = l.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    if (/^\s*[-•]\s+/.test(l)) {
      if (!enLista) { html += "<ul>"; enLista = true; }
      html += `<li>${conNegritas.replace(/^\s*[-•]\s+/, "")}</li>`;
    } else {
      if (enLista) { html += "</ul>"; enLista = false; }
      if (l.trim()) html += `<p>${conNegritas}</p>`;
    }
  }
  return html + (enLista ? "</ul>" : "");
}

const pesos = (n) => `$${Math.round(n).toLocaleString("es-MX")}`;

function htmlRespuesta(d, i) {
  const recetas = d.recetas?.length ? `
    <div class="asis-recetas">${d.recetas.map((r) => `
      <a class="asis-receta" href="receta.html?id=${r.idReceta}">
        ${r.urlImagen ? `<img src="${esc(r.urlImagen)}" alt="" loading="lazy">` : `<span class="asis-receta__sin-foto">${icon("utensils-crossed", 22)}</span>`}
        <span class="asis-receta__texto">
          <strong>${esc(r.nombreReceta)}</strong>
          <span>${esc([r.municipio, r.estado].filter(Boolean).join(", "))}</span>
          ${r.costo != null ? `<span class="asis-receta__costo">≈ ${pesos(r.costo)} · ${pesos(r.porPorcion)} c/u</span>` : ""}
        </span>
      </a>`).join("")}
    </div>` : "";
  const lista = d.lista ? `
    <details class="asis-lista" open>
      <summary>${icon("shopping-basket", 16)} ${esc(d.lista.titulo)}</summary>
      <ul>${d.lista.lineas.map((l) => `<li><span>${esc(l.cantidad)} ${esc(l.nombre)}</span><span>${l.estimado ? "≈ " : "~ "}${pesos(l.costo)}</span></li>`).join("")}</ul>
      <p class="asis-lista__total"><span>Total estimado</span><strong>${pesos(d.lista.total)}</strong></p>
      ${d.lista.nota ? `<p class="asis-nota">${esc(d.lista.nota)}</p>` : ""}
    </details>` : "";
  const hayMapa = d.mapa && (d.mapa.puntos?.length || d.mapa.estados?.length);
  const enlaceMapa = d.mapa?.enlace || (d.mapa?.estados?.length === 1 ? `estado.html?id=${d.mapa.estados[0]}` : "index.html#territorio");
  return `
    <div class="asis-msg asis-msg--bot" data-sin-traducir>
      <div class="asis-burbuja">${formato(d.texto)}</div>
      ${lista}${recetas}
      ${hayMapa ? `<div class="asis-mapa" data-asis-mapa="${i}"></div>
        <div class="asis-mapa-acciones">
          <button type="button" class="enlace" data-ver-mapa="${i}">${icon("map", 16)} Ver en el mapa</button>
          <a class="enlace" href="${enlaceMapa}">${icon("maximize-2", 14)} Abrir mapa grande</a>
        </div>` : ""}
      ${d.fuente === "ia" ? '<p class="asis-nota">Redactado con IA a partir de los datos de SIGEPA.</p>' : ""}
    </div>`;
}

/* ---------- Panel ---------- */
export function montarAsistente() {
  document.body.insertAdjacentHTML("beforeend", `
    <button class="asis-boton" type="button" data-asis-abrir aria-haspopup="dialog" aria-label="Abrir asistente">
      ${icon("bot-message-square", 22)}<span>Asistente</span>
    </button>
    <section class="asis-panel" hidden data-asis-panel role="dialog" aria-label="Asistente de SIGEPA">
      <header class="asis-panel__encabezado">
        <span class="asis-panel__logo">${icon("bot-message-square", 20)}</span>
        <div>
          <h2>Asistente SIGEPA</h2>
          <p>Recetas, presupuesto e ingredientes con el mapa</p>
        </div>
        <button type="button" class="asis-icono" data-asis-limpiar aria-label="Nueva conversación" title="Nueva conversación">${icon("rotate-ccw", 18)}</button>
        <button type="button" class="asis-icono" data-asis-cerrar aria-label="Cerrar asistente">${icon("x", 20)}</button>
      </header>
      <div class="asis-mensajes" data-asis-mensajes aria-live="polite"></div>
      <div class="asis-sugerencias" data-asis-sugerencias></div>
      <form class="asis-form" data-asis-form>
        <textarea name="mensaje" rows="1" maxlength="500" placeholder="Ej.: tengo 150 pesos para 3 personas" aria-label="Escribe tu pregunta" required></textarea>
        <button type="submit" class="asis-enviar" aria-label="Enviar">${icon("send", 18)}</button>
      </form>
      <p class="asis-aviso">Precios aproximados de referencia. Recolecta con permiso y sin dañar las plantas.</p>
    </section>`);

  const panel = document.querySelector("[data-asis-panel]");
  const boton = document.querySelector("[data-asis-abrir]");
  const caja = document.querySelector("[data-asis-mensajes]");
  const sug = document.querySelector("[data-asis-sugerencias]");
  const form = document.querySelector("[data-asis-form]");
  const entrada = form.mensaje;
  let mapaActual = null;
  let ocupado = false;

  async function pintarMapa(i) {
    const d = estado.mensajes[i]?.datos;
    const el = caja.querySelector(`[data-asis-mapa="${i}"]`);
    if (!d || !el || panel.hidden) return;
    await cargarLeaflet();
    const { crearAtlas } = await import("./mapa-mexico.js");
    if (mapaActual) { mapaActual.atlas.mapa.remove(); mapaActual.el.innerHTML = ""; mapaActual.el.classList.remove("asis-mapa--visible"); }
    el.classList.add("asis-mapa--visible");
    const atlas = crearAtlas(el, { alSeleccionarEstado: (id) => { location.href = `estado.html?id=${id}`; } });
    mapaActual = { atlas, el };
    atlas.mostrarPuntos(d.mapa.puntos ?? []);
    // Con estados resaltados (p. ej. dónde se da un ingrediente) se encuadran los estados; si no, los pines.
    if (d.mapa.estados?.length) await atlas.resaltarEstados(d.mapa.estados);
    else if (d.mapa.puntos?.length) atlas.encuadrarPuntos({ maxZoom: 7 });
  }

  function pintar() {
    caja.innerHTML = estado.mensajes.length ? "" : `
      <div class="asis-msg asis-msg--bot"><div class="asis-burbuja">
        <p><strong>Hola.</strong> Pregúntame qué cocinar con tu presupuesto, dónde se recolecta o se consigue un ingrediente, o recetas de un estado. Te lo muestro en el mapa.</p>
      </div></div>`;
    estado.mensajes.forEach((m, i) => {
      caja.insertAdjacentHTML("beforeend", m.rol === "usuario"
        ? `<div class="asis-msg asis-msg--usuario" data-sin-traducir><div class="asis-burbuja">${esc(m.texto)}</div></div>`
        : htmlRespuesta(m.datos, i));
    });
    const ultima = [...estado.mensajes].reverse().find((m) => m.rol === "asistente");
    const lista = ultima?.datos?.sugerencias?.length ? ultima.datos.sugerencias : SUGERENCIAS;
    sug.innerHTML = lista.slice(0, 4).map((s) => `<button type="button" class="chip" data-sin-traducir>${esc(s)}</button>`).join("");
    // Muestra el inicio de la última respuesta (no el final), para leerla desde arriba
    const ultimaBurbuja = [...caja.querySelectorAll(".asis-msg")].at(-1);
    caja.scrollTop = ultimaBurbuja?.classList.contains("asis-msg--bot") && estado.mensajes.length
      ? Math.max(0, (ultimaBurbuja.previousElementSibling ?? ultimaBurbuja).offsetTop - 8) : caja.scrollHeight;
    mapaActual = null;
    const idx = estado.mensajes.findLastIndex((m) => m.rol === "asistente" && (m.datos?.mapa?.puntos?.length || m.datos?.mapa?.estados?.length));
    if (idx >= 0 && idx >= estado.mensajes.length - 2) pintarMapa(idx);
  }

  async function enviar(texto) {
    texto = texto.trim();
    if (!texto || ocupado) return;
    ocupado = true;
    const historial = estado.mensajes.slice(-6).map((m) => ({ rol: m.rol, texto: m.rol === "usuario" ? m.texto : m.datos.texto }));
    estado.mensajes.push({ rol: "usuario", texto });
    guardar(); pintar();
    entrada.value = ""; entrada.style.height = "";
    caja.insertAdjacentHTML("beforeend", `<div class="asis-msg asis-msg--bot" data-asis-escribiendo><div class="asis-burbuja asis-escribiendo"><span></span><span></span><span></span></div></div>`);
    caja.scrollTop = caja.scrollHeight;
    try {
      const datos = await api("/asistente", { metodo: "POST", cuerpo: { mensaje: texto, historial } });
      estado.mensajes.push({ rol: "asistente", datos });
    } catch (err) {
      estado.mensajes.push({ rol: "asistente", datos: { texto: `No pude responder ahora (${err.message}). Intenta de nuevo en un momento.`, recetas: [], mapa: {}, sugerencias: [] } });
    }
    ocupado = false;
    guardar(); pintar();
    entrada.focus();
  }

  const abrir = () => {
    panel.hidden = false; boton.hidden = true; estado.abierto = true; guardar();
    document.querySelector("[data-menu]")?.setAttribute("hidden", "");
    document.querySelector("[data-cortina]")?.setAttribute("hidden", "");
    pintar(); entrada.focus();
  };
  const cerrar = () => { panel.hidden = true; boton.hidden = false; estado.abierto = false; guardar(); boton.focus(); };

  boton.addEventListener("click", abrir);
  panel.querySelector("[data-asis-cerrar]").addEventListener("click", cerrar);
  panel.querySelector("[data-asis-limpiar]").addEventListener("click", () => { estado.mensajes = []; guardar(); pintar(); });
  panel.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrar(); });
  form.addEventListener("submit", (e) => { e.preventDefault(); enviar(entrada.value); });
  entrada.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(entrada.value); } });
  entrada.addEventListener("input", () => { entrada.style.height = ""; entrada.style.height = `${Math.min(entrada.scrollHeight, 120)}px`; });
  sug.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) enviar(b.textContent); });
  caja.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ver-mapa]");
    if (b) pintarMapa(Number(b.dataset.verMapa)).then(() => caja.querySelector(`[data-asis-mapa="${b.dataset.verMapa}"]`)?.scrollIntoView({ block: "nearest" }));
  });

  // Atajo para otras pantallas: <a data-preguntar="...">
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-preguntar]");
    if (!a) return;
    e.preventDefault(); abrir(); enviar(a.dataset.preguntar);
  });

  if (estado.abierto) abrir();
}
