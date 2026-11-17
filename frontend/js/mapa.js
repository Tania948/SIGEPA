// Mapa interactivo de México (geometría del diseño de Figma).
import { ESTADOS_MAPA, ETIQUETAS_MAPA, MAPA_H, MAPA_W } from "./mapa-data.js";

const NS = "http://www.w3.org/2000/svg";
const normalizar = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Dibuja el mapa dentro de `contenedor` (.mapa).
 * @param {object} op
 * @param {(nombre:string)=>void} op.alSeleccionar  se llama al hacer clic en un estado
 * @param {(nombre:string)=>string} [op.textoTooltip] texto al pasar el cursor
 */
export function crearMapa(contenedor, { alSeleccionar, textoTooltip = (n) => n } = {}) {
  const lienzo = contenedor.querySelector("[data-lienzo]");
  const etiqueta = contenedor.querySelector("[data-seleccion]");
  const tooltip = contenedor.querySelector("[data-tooltip]");
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${MAPA_W} ${MAPA_H}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("role", "group");
  svg.setAttribute("aria-label", "Mapa de los estados de México");

  const paths = new Map();
  for (const [nombre, x, y, d] of ESTADOS_MAPA) {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", d);
    p.setAttribute("transform", `translate(${x} ${y})`);
    p.setAttribute("class", "mapa__estado");
    p.setAttribute("tabindex", "0");
    p.setAttribute("role", "button");
    p.setAttribute("aria-label", nombre);
    p.dataset.estado = nombre;
    svg.appendChild(p);
    paths.set(normalizar(nombre), p);
  }
  for (const [texto, x, y, clase] of ETIQUETAS_MAPA) {
    const t = document.createElementNS(NS, "text");
    t.setAttribute("x", x);
    t.setAttribute("y", y + 11);
    t.setAttribute("class", clase);
    t.textContent = texto;
    svg.appendChild(t);
  }
  const punto = document.createElementNS(NS, "circle");
  punto.setAttribute("r", "3.5");
  punto.setAttribute("class", "mapa__punto");
  punto.style.display = "none";
  svg.appendChild(punto);
  lienzo.appendChild(svg);

  // Interacción
  const elegir = (p) => alSeleccionar?.(p.dataset.estado);
  svg.addEventListener("click", (e) => { const p = e.target.closest(".mapa__estado"); if (p) elegir(p); });
  svg.addEventListener("keydown", (e) => {
    const p = e.target.closest(".mapa__estado");
    if (p && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); elegir(p); }
  });
  svg.addEventListener("mousemove", (e) => {
    const p = e.target.closest(".mapa__estado");
    if (!p) { tooltip.hidden = true; return; }
    const caja = contenedor.getBoundingClientRect();
    tooltip.textContent = textoTooltip(p.dataset.estado);
    tooltip.style.left = `${e.clientX - caja.left}px`;
    tooltip.style.top = `${e.clientY - caja.top}px`;
    tooltip.hidden = false;
  });
  svg.addEventListener("mouseleave", () => { tooltip.hidden = true; });

  // Zoom
  let escala = 1;
  contenedor.querySelectorAll("[data-zoom]").forEach((b) => b.addEventListener("click", () => {
    escala = Math.min(2.5, Math.max(1, escala + Number(b.dataset.zoom) * 0.5));
    lienzo.style.transform = `scale(${escala})`;
    etiqueta.hidden = escala !== 1 || !etiqueta.textContent;
  }));

  return {
    /** Resalta un estado por nombre. */
    seleccionar(nombre) {
      paths.forEach((p) => p.classList.remove("mapa__estado--activo"));
      const p = paths.get(normalizar(nombre || ""));
      if (!p) { etiqueta.hidden = true; punto.style.display = "none"; return; }
      p.classList.add("mapa__estado--activo");
      svg.insertBefore(p, punto); // al frente para que se vea el borde completo
      const b = p.getBBox();
      const [, x, y] = ESTADOS_MAPA.find(([n]) => n === p.dataset.estado);
      const cx = x + b.x + b.width / 2;
      const cy = y + b.y + b.height / 2;
      punto.setAttribute("cx", cx);
      punto.setAttribute("cy", cy);
      punto.style.display = "";
      // Etiqueta "Estado · seleccionado" debajo del estado (como en el diseño)
      const factor = contenedor.clientWidth / MAPA_W;
      etiqueta.textContent = `${p.dataset.estado} · seleccionado`;
      etiqueta.hidden = escala !== 1;
      const ancho = etiqueta.offsetWidth || 150;
      const izq = Math.min(Math.max(cx * factor - ancho / 2 + 40 * factor, 8), contenedor.clientWidth - ancho - 8);
      const arriba = Math.min((y + b.y + b.height) * factor + 34 * factor, contenedor.clientHeight - 40);
      etiqueta.style.left = `${izq}px`;
      etiqueta.style.top = `${arriba}px`;
    },
  };
}
