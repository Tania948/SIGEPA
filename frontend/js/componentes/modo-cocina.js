// Modo cocina: la receta paso a paso en pantalla completa, pensada para cocinar con las manos ocupadas.
//  - Letra grande y un paso a la vez.
//  - Lectura en voz alta (síntesis de voz del navegador, en español).
//  - Manos libres: di "siguiente", "anterior", "repite" o "temporizador" (reconocimiento de voz, Chrome y Edge).
//  - Temporizadores que se detectan solos en el texto ("hierve 20 minutos").
//  - La pantalla no se apaga mientras está abierto (Wake Lock).
// Todo funciona en el navegador; nada se envía a SIGEPA.
import { esc } from "../nucleo/api.js";
import { icon } from "../nucleo/icons.js";

const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
const puedeHablar = "speechSynthesis" in window;

/** Busca duraciones en un texto: "20 minutos", "1 hora", "media hora", "2 a 3 horas" (toma la mayor). */
export function detectarTiempos(texto) {
  const t = texto.toLowerCase();
  const tiempos = [];
  const re = /(\d+(?:[.,]\d+)?)(?:\s*(?:a|o|-)\s*(\d+(?:[.,]\d+)?))?\s*(minutos?|min\b|horas?|hrs?\b|segundos?)/g;
  for (let m; (m = re.exec(t));) {
    const n = Number((m[2] ?? m[1]).replace(",", "."));
    const seg = /^h/.test(m[3]) ? n * 3600 : /^s/.test(m[3]) ? n : n * 60;
    if (seg >= 10 && seg <= 12 * 3600) tiempos.push({ segundos: seg, texto: m[0] });
  }
  if (/media hora/.test(t)) tiempos.push({ segundos: 1800, texto: "media hora" });
  return tiempos.slice(0, 3);
}

const formatoTiempo = (s) => {
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const seg = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(seg).padStart(2, "0")}` : `${m}:${String(seg).padStart(2, "0")}`;
};

function pitido() {
  try {
    const ctx = new AudioContext();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.25, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.3);
    });
    navigator.vibrate?.([300, 150, 300]);
  } catch { /* sin audio */ }
}

/**
 * Abre el modo cocina.
 * @param {object} r receta (de la API)
 * @param {{ ingredientes: string[] }} opciones ingredientes ya escalados a las porciones elegidas
 */
export function abrirModoCocina(r, { ingredientes }) {
  const pasos = [
    { titulo: "Antes de empezar", texto: "Ten a la mano estos ingredientes.", lista: ingredientes },
    ...r.pasos.map((p, i) => ({ titulo: p.titulo || `Paso ${i + 1}`, texto: p.texto })),
    { titulo: "¡Buen provecho!", texto: r.consejo ? `Un consejo de quien comparte la receta: ${r.consejo}` : "Comparte en los comentarios cómo te quedó." },
  ];
  let actual = 0;
  let leerSolo = false;
  let escucha = null;
  let candado = null;
  const temporizadores = new Map(); // id -> { restante, intervalo }

  document.body.insertAdjacentHTML("beforeend", `
    <div class="cocina" role="dialog" aria-modal="true" aria-label="Modo cocina: ${esc(r.nombreReceta)}" data-cocina>
      <header class="cocina__barra">
        <div><p class="cocina__titulo">${icon("chef-hat", 20)} ${esc(r.nombreReceta)}</p><p class="cocina__progreso" data-progreso></p></div>
        <div class="cocina__herramientas">
          ${puedeHablar ? `<button type="button" class="cocina__btn" data-leer aria-pressed="false">${icon("volume-2", 20)}<span>Leer en voz alta</span></button>` : ""}
          ${Reconocimiento ? `<button type="button" class="cocina__btn" data-manos aria-pressed="false">${icon("mic", 20)}<span>Manos libres</span></button>` : ""}
          <button type="button" class="cocina__btn cocina__cerrar" data-cerrar aria-label="Salir del modo cocina">${icon("x", 22)}</button>
        </div>
      </header>
      <div class="cocina__barra-progreso"><span data-avance></span></div>
      <main class="cocina__paso" data-paso aria-live="polite"></main>
      <div class="cocina__temporizadores" data-temporizadores></div>
      <footer class="cocina__nav">
        <button type="button" class="btn btn--secundario" data-anterior>${icon("chevron-left", 20)} Anterior</button>
        <p class="cocina__ayuda" data-ayuda></p>
        <button type="button" class="btn btn--primario" data-siguiente>Siguiente ${icon("chevron-right", 20)}</button>
      </footer>
    </div>`);
  const raiz = document.querySelector("[data-cocina]");
  const $ = (s) => raiz.querySelector(s);
  document.body.style.overflow = "hidden";

  const hablar = (texto) => {
    if (!puedeHablar) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "es-MX";
    const voz = speechSynthesis.getVoices().find((v) => v.lang === "es-MX") || speechSynthesis.getVoices().find((v) => v.lang.startsWith("es"));
    if (voz) u.voice = voz;
    u.rate = 0.95;
    speechSynthesis.speak(u);
  };
  const textoPaso = (p) => `${p.titulo}. ${p.texto} ${p.lista ? p.lista.join(", ") : ""}`;

  function pintar() {
    const p = pasos[actual];
    const tiempos = p.lista ? [] : detectarTiempos(p.texto);
    $("[data-progreso]").textContent = actual === 0 ? "Preparación" : actual === pasos.length - 1 ? "Listo" : `Paso ${actual} de ${pasos.length - 2}`;
    $("[data-avance]").style.width = `${(actual / (pasos.length - 1)) * 100}%`;
    $("[data-paso]").innerHTML = `
      <h2>${esc(p.titulo)}</h2>
      <p>${esc(p.texto)}</p>
      ${p.lista ? `<ul class="cocina__ingredientes">${p.lista.map((i, n) => `<li><label><input type="checkbox" id="ci${n}"> ${esc(i)}</label></li>`).join("")}</ul>` : ""}
      ${tiempos.length ? `<div class="cocina__tiempos">${tiempos.map((t) => `
        <button type="button" class="btn btn--secundario" data-iniciar="${t.segundos}" data-etiqueta="${esc(p.titulo)}">${icon("timer", 18)} Temporizador de ${esc(t.texto)}</button>`).join("")}</div>` : ""}`;
    $("[data-anterior]").disabled = actual === 0;
    $("[data-siguiente]").innerHTML = actual === pasos.length - 1 ? `Terminar ${icon("check", 20)}` : `Siguiente ${icon("chevron-right", 20)}`;
    if (leerSolo) hablar(textoPaso(p));
  }

  function ir(d) {
    if (actual === pasos.length - 1 && d > 0) { cerrar(); return; }
    actual = Math.min(Math.max(0, actual + d), pasos.length - 1);
    pintar();
  }

  function pintarTemporizadores() {
    $("[data-temporizadores]").innerHTML = [...temporizadores.entries()].map(([id, t]) => `
      <div class="temporizador ${t.restante <= 0 ? "temporizador--listo" : ""}">
        ${icon("timer", 18)}<span>${esc(t.etiqueta)}</span><strong>${t.restante <= 0 ? "¡Listo!" : formatoTiempo(t.restante)}</strong>
        <button type="button" data-quitar="${id}" aria-label="Quitar temporizador">${icon("x", 16)}</button>
      </div>`).join("");
  }
  function iniciarTemporizador(segundos, etiqueta) {
    const id = String(Date.now());
    const t = { restante: segundos, etiqueta };
    t.intervalo = setInterval(() => {
      t.restante -= 1;
      if (t.restante === 0) { pitido(); hablar(`Terminó el tiempo de ${etiqueta}`); }
      if (t.restante <= -60) { clearInterval(t.intervalo); temporizadores.delete(id); }
      pintarTemporizadores();
    }, 1000);
    temporizadores.set(id, t);
    pintarTemporizadores();
  }

  async function mantenerPantalla() {
    try { candado = await navigator.wakeLock?.request("screen"); } catch { /* no disponible */ }
  }
  const alVolver = () => { if (document.visibilityState === "visible" && raiz.isConnected) mantenerPantalla(); };

  function alternarManosLibres() {
    const btn = $("[data-manos]");
    if (escucha) { escucha.onend = null; escucha.stop(); escucha = null; btn.setAttribute("aria-pressed", "false"); $("[data-ayuda]").textContent = ""; return; }
    escucha = new Reconocimiento();
    escucha.lang = "es-MX"; escucha.continuous = true; escucha.interimResults = false;
    escucha.onresult = (e) => {
      const dicho = e.results[e.results.length - 1][0].transcript.toLowerCase();
      if (/siguiente|adelante|listo|ya qued/.test(dicho)) ir(1);
      else if (/anterior|atr[aá]s|regresa/.test(dicho)) ir(-1);
      else if (/repite|otra vez|lee/.test(dicho)) hablar(textoPaso(pasos[actual]));
      else if (/temporizador|cron[oó]metro|alarma/.test(dicho)) {
        const b = raiz.querySelector("[data-iniciar]");
        if (b) iniciarTemporizador(Number(b.dataset.iniciar), b.dataset.etiqueta);
      } else if (/salir|cerrar|terminar/.test(dicho)) cerrar();
    };
    escucha.onend = () => { if (escucha) try { escucha.start(); } catch { /* ya activo */ } };
    escucha.onerror = (e) => { if (e.error === "not-allowed") { $("[data-ayuda]").textContent = "Permite el micrófono para usar manos libres."; escucha = null; btn.setAttribute("aria-pressed", "false"); } };
    escucha.start();
    btn.setAttribute("aria-pressed", "true");
    $("[data-ayuda]").textContent = "Di «siguiente», «anterior», «repite» o «temporizador».";
  }

  function cerrar() {
    temporizadores.forEach((t) => clearInterval(t.intervalo));
    if (escucha) { escucha.onend = null; escucha.stop(); }
    if (puedeHablar) speechSynthesis.cancel();
    candado?.release?.();
    document.removeEventListener("keydown", teclas);
    document.removeEventListener("visibilitychange", alVolver);
    document.body.style.overflow = "";
    raiz.remove();
  }
  function teclas(e) {
    if (e.key === "ArrowRight") ir(1);
    else if (e.key === "ArrowLeft") ir(-1);
    else if (e.key === "Escape") cerrar();
  }

  $("[data-siguiente]").addEventListener("click", () => ir(1));
  $("[data-anterior]").addEventListener("click", () => ir(-1));
  $("[data-cerrar]").addEventListener("click", cerrar);
  $("[data-leer]")?.addEventListener("click", (e) => {
    leerSolo = !leerSolo;
    e.currentTarget.setAttribute("aria-pressed", String(leerSolo));
    if (leerSolo) hablar(textoPaso(pasos[actual])); else speechSynthesis.cancel();
  });
  $("[data-manos]")?.addEventListener("click", alternarManosLibres);
  raiz.addEventListener("click", (e) => {
    const b = e.target.closest("[data-iniciar]");
    if (b) iniciarTemporizador(Number(b.dataset.iniciar), b.dataset.etiqueta);
    const q = e.target.closest("[data-quitar]");
    if (q) { clearInterval(temporizadores.get(q.dataset.quitar)?.intervalo); temporizadores.delete(q.dataset.quitar); pintarTemporizadores(); }
  });
  document.addEventListener("keydown", teclas);
  document.addEventListener("visibilitychange", alVolver);
  mantenerPantalla();
  pintar();
  $("[data-siguiente]").focus();
}
