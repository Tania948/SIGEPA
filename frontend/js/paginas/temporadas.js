// Página: Calendario de temporada (ingredientes por mes y estado, con mapa)
import { api, esc, parametro } from "../nucleo/api.js";
import { hydrateIcons, icon } from "../nucleo/icons.js";
import { montarLayout, ruta } from "../componentes/layout.js";
import { cargando, estadoVacio } from "../componentes/componentes.js";
import { crearAtlas } from "../componentes/mapa-mexico.js";

montarLayout("temporadas");
document.querySelector("[data-ruta]").outerHTML = ruta([["Inicio", "index.html"], ["Calendario de temporada"]]);

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const ICONO_TIPO = { "Recolección": "sprout", Cultivo: "wheat", Pesca: "fish", Crianza: "drumstick", Elaborado: "cooking-pot" };

const lista = document.querySelector("[data-lista]");
const selEstado = document.querySelector("[data-estado]");
const atlas = crearAtlas(document.querySelector("[data-mapa]"));
let mes = parametro("mes") !== null ? Number(parametro("mes")) : new Date().getMonth();
let datos = null;
let puntos = [];

function pintarMeses() {
  const actual = new Date().getMonth();
  document.querySelector("[data-meses]").innerHTML = MESES.map((m, i) => `
    <button type="button" class="mes${i === mes ? " mes--activo" : ""}" data-mes="${i}" aria-pressed="${i === mes}">
      ${m.slice(0, 3)}${i === actual ? '<span class="mes__hoy">hoy</span>' : ""}
    </button>`).join("");
  document.querySelector("[data-mes-titulo]").textContent = MESES[mes].toLowerCase();
}

function tarjeta(i, n) {
  return `
    <article class="ingrediente-temporada" tabindex="0" data-indice="${n}">
      <header>
        <span class="icono-circulo icono-circulo--chico">${icon(ICONO_TIPO[i.tipo] ?? "leaf", 20)}</span>
        <div><h2>${esc(i.nombre)}</h2><p class="texto-xs"><span class="insignia">${esc(i.tipo)}</span> ${esc(i.temporada)}</p></div>
      </header>
      <p class="texto-sm">${esc(i.donde)}</p>
      ${i.cuidado ? `<p class="cuidado">${icon("info", 16)} ${esc(i.cuidado)}</p>` : ""}
      <p class="estados-chips">${i.estados.map((e) => `<a class="chip" href="estado.html?id=${e.idEstado}">${esc(e.nomEstado)}</a>`).join("")}</p>
      ${i.recetas.length ? `<p class="texto-sm"><strong>En recetas:</strong> ${i.recetas.map((r) => `<a class="enlace" href="receta.html?id=${r.idReceta}">${esc(r.nombreReceta)}</a>`).join(", ")}</p>` : ""}
    </article>`;
}

function mostrarEnMapa(n) {
  const i = datos.ingredientes[n];
  lista.querySelectorAll(".ingrediente-temporada").forEach((t) => t.classList.toggle("ingrediente-temporada--activo", Number(t.dataset.indice) === n));
  document.querySelector("[data-mapa-titulo]").textContent = `Dónde se da: ${i.nombre}`;
  const ids = new Set(i.recetas.map((r) => r.idReceta));
  atlas.mostrarPuntos(puntos.filter((p) => ids.has(p.idReceta)));
  atlas.resaltarEstados(i.estados.map((e) => e.idEstado));
}

async function cargar() {
  pintarMeses();
  lista.innerHTML = cargando();
  const estado = selEstado.value;
  history.replaceState(null, "", `temporadas.html?mes=${mes}${estado ? `&estado=${estado}` : ""}`);
  try {
    datos = await api(`/temporadas?mes=${mes}${estado ? `&estado=${estado}` : ""}`);
  } catch (err) {
    lista.innerHTML = estadoVacio(err.message);
    return;
  }
  const lugar = datos.estado ? `en ${datos.estado.nomEstado}` : "en México";
  const propios = datos.ingredientes.filter((i) => !i.todoElAnio).length;
  lista.innerHTML = datos.ingredientes.length
    ? `<p class="texto-sm temporada__resumen">${datos.ingredientes.length} ingredientes ${lugar} en ${MESES[mes].toLowerCase()}${propios ? `, ${propios} propios de esta época` : ""}.
         <button type="button" class="enlace" data-preguntar="¿Qué se recolecta ${datos.estado ? `en ${datos.estado.nomEstado} ` : ""}en esta temporada?">${icon("bot-message-square", 16)} Pregúntale al asistente</button></p>`
      + datos.ingredientes.map(tarjeta).join("")
    : estadoVacio(`No tenemos ingredientes registrados ${lugar} para ${MESES[mes].toLowerCase()}.`);
  hydrateIcons();
  if (datos.ingredientes.length) mostrarEnMapa(0);
  else { atlas.mostrarPuntos([]); atlas.resaltarEstados(estado ? [Number(estado)] : []); }
}

document.querySelector("[data-meses]").addEventListener("click", (e) => {
  const b = e.target.closest("[data-mes]");
  if (!b) return;
  mes = Number(b.dataset.mes);
  cargar();
});
selEstado.addEventListener("change", cargar);
lista.addEventListener("click", (e) => {
  const t = e.target.closest(".ingrediente-temporada");
  if (t && !e.target.closest("a")) mostrarEnMapa(Number(t.dataset.indice));
});
lista.addEventListener("keydown", (e) => {
  const t = e.target.closest(".ingrediente-temporada");
  if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); mostrarEnMapa(Number(t.dataset.indice)); }
});

(async () => {
  const [estados, mapa] = await Promise.all([api("/estados").catch(() => []), api("/recetas/mapa").catch(() => [])]);
  puntos = mapa;
  selEstado.insertAdjacentHTML("beforeend", estados.map((e) => `<option value="${e.idEstado}">${esc(e.nomEstado)}</option>`).join(""));
  selEstado.value = parametro("estado") ?? "";
  cargar();
})();
