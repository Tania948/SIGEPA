// Dictado por voz: agrega un botón de micrófono a los campos con data-dictado.
// Pensado para portadoras y portadores de saberes que prefieren contar la receta en lugar de escribirla.
// Usa el reconocimiento de voz del navegador (Chrome, Edge y Safari); si no existe, no muestra el botón.
import { icon } from "../nucleo/icons.js";

const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
export const hayDictado = Boolean(Reconocimiento);

let activo = null; // { reco, campo, boton }

function detener() {
  if (!activo) return;
  activo.reco.onend = null;
  activo.reco.stop();
  activo.boton.setAttribute("aria-pressed", "false");
  activo.boton.classList.remove("dictado--escuchando");
  activo = null;
}

function iniciar(campo, boton) {
  detener();
  const reco = new Reconocimiento();
  reco.lang = "es-MX";
  reco.continuous = true;
  reco.interimResults = false;
  reco.onresult = (e) => {
    const texto = [...e.results].slice(e.resultIndex).filter((r) => r.isFinal).map((r) => r[0].transcript.trim()).join(" ");
    if (!texto) return;
    const previo = campo.value.trimEnd();
    const frase = texto.charAt(0).toUpperCase() + texto.slice(1);
    campo.value = `${previo}${previo && !/[.!?]$/.test(previo) ? ". " : previo ? " " : ""}${frase}`.slice(0, Number(campo.maxLength) > 0 ? campo.maxLength : undefined);
    campo.dispatchEvent(new Event("input", { bubbles: true }));
  };
  reco.onerror = (e) => {
    if (e.error === "not-allowed") boton.title = "Permite el micrófono en tu navegador para dictar.";
    detener();
  };
  reco.onend = () => detener();
  reco.start();
  activo = { reco, campo, boton };
  boton.setAttribute("aria-pressed", "true");
  boton.classList.add("dictado--escuchando");
}

/** Agrega el botón de dictado a cada campo [data-dictado] dentro de raiz (también a los que se agreguen después). */
export function activarDictado(raiz = document) {
  if (!hayDictado) return;
  const preparar = (campo) => {
    if (campo.dataset.dictadoListo) return;
    campo.dataset.dictadoListo = "1";
    const contenedor = campo.closest(".entrada") ?? campo.parentElement;
    contenedor.classList.add("entrada--dictado");
    contenedor.insertAdjacentHTML("beforeend",
      `<button type="button" class="dictado" aria-pressed="false" aria-label="Dictar con la voz" title="Dictar con la voz">${icon("mic", 18)}</button>`);
    const boton = contenedor.lastElementChild;
    boton.addEventListener("click", () => (activo?.campo === campo ? detener() : iniciar(campo, boton)));
  };
  raiz.querySelectorAll("[data-dictado]").forEach(preparar);
  new MutationObserver(() => raiz.querySelectorAll("[data-dictado]").forEach(preparar))
    .observe(raiz, { childList: true, subtree: true });
}
