// Pantalla: Recetas · Resultados de búsqueda
import { api, esc } from "./api.js";
import { DIFICULTADES, RANGOS_TIEMPO, TIPOS_PLATILLO } from "./catalogos.js";
import { activarFavoritos, cargando, estadoVacio, paginacion, pildoraMenu, tarjetaReceta } from "./componentes.js";
import { icon } from "./icons.js";
import { montarLayout, ruta } from "./layout.js";

montarLayout("recetas");
const $ = (s) => document.querySelector(s);
$("[data-ruta]").outerHTML = ruta([["Inicio", "index.html"], ["Recetas", "recetas.html"], ["Resultados de búsqueda"]]);

const POR_PAGINA = 6;
const CLAVES = ["q", "nombre", "ing", "ingModo", "estado", "region", "tipo", "dificultad", "tiempo", "tiempoMax", "conFoto", "orden", "page"];
let params = Object.fromEntries([...new URLSearchParams(location.search)].filter(([k, v]) => CLAVES.includes(k) && v));
let estados = [];

const lista = $("[data-lista]");
activarFavoritos(lista);
const form = $("[data-refinar]");

// Opciones de los filtros
$("#f-tipo").insertAdjacentHTML("beforeend", TIPOS_PLATILLO.map((t) => `<option>${esc(t)}</option>`).join(""));
$("#f-dificultad").insertAdjacentHTML("beforeend", DIFICULTADES.map((t) => `<option>${esc(t)}</option>`).join(""));
$("[data-tiempos]").innerHTML = RANGOS_TIEMPO.map((r) =>
  `<label class="casilla"><input type="checkbox" name="tiempo" value="${r.valor}"> ${r.texto}</label>`).join("");

const orden = pildoraMenu($("[data-orden]"), {
  etiqueta: "Ordenar: más recientes",
  opciones: [
    { valor: "", texto: "Ordenar: más recientes" }, { valor: "antiguas", texto: "Ordenar: más antiguas" },
    { valor: "tiempo", texto: "Ordenar: menor tiempo" }, { valor: "nombre", texto: "Ordenar: nombre (A–Z)" },
  ],
  valor: params.orden ?? "", alinear: "derecha",
  alCambiar: (v) => { actualizar({ orden: v || undefined, page: undefined }); },
});
orden; // la píldora se queda en la barra

function rellenarFormulario() {
  $("#q").value = params.q ?? params.nombre ?? "";
  form.estado.value = params.estado?.split(",")[0] ?? "";
  form.tipo.value = params.tipo ?? "";
  form.dificultad.value = params.dificultad ?? "";
  form.conFoto.checked = params.conFoto === "1";
  const rangos = (params.tiempo ?? "").split(",");
  form.querySelectorAll("[name=tiempo]").forEach((c) => { c.checked = rangos.includes(c.value); });
}

function nombreEstado(id) { return estados.find((e) => e.idEstado === Number(id))?.nomEstado ?? ""; }

function encabezado() {
  const termino = params.q || params.nombre;
  const estado = params.estado && nombreEstado(params.estado);
  let titulo = "Todas las recetas";
  let sub = "Sabores compartidos por las comunidades de México.";
  if (termino) { titulo = `Recetas con ${termino}`; sub = "Distintos lugares, un ingrediente que nos reúne."; }
  else if (params.ing) { titulo = `Recetas con ${params.ing.split(",").join(", ")}`; sub = "Distintos lugares, ingredientes que nos reúnen."; }
  else if (estado) { titulo = `Recetas de ${estado}`; sub = "Cada receta conserva su lugar de origen y la voz de quien la comparte."; }
  $("[data-titulo]").textContent = titulo;
  $("[data-subtitulo]").textContent = sub;
  document.title = `${titulo} · SIGEPA MX`;
}

/** Chips de "Filtros activos" con su botón para quitarlos. */
function chipsActivos() {
  const chips = [];
  const chip = (texto, quitar) => chips.push(`<span class="chip">${esc(texto)}<button class="chip__quitar" type="button" data-quitar='${JSON.stringify(quitar)}' aria-label="Quitar filtro ${esc(texto)}">${icon("x", 14)}</button></span>`);
  if (params.q) chip(`Búsqueda: ${params.q}`, { q: undefined });
  if (params.nombre) chip(`Nombre: ${params.nombre}`, { nombre: undefined });
  (params.ing ?? "").split(",").filter(Boolean).forEach((i) =>
    chip(`Ingrediente: ${i}`, { ing: params.ing.split(",").filter((x) => x !== i).join(",") || undefined }));
  if (params.estado) chip(`Estado: ${params.estado.split(",").map(nombreEstado).join(", ")}`, { estado: undefined, region: undefined });
  if (params.region) chip(`Región: ${params.region}`, { region: undefined });
  if (params.tipo) chip(params.tipo, { tipo: undefined });
  if (params.dificultad) chip(`Dificultad: ${params.dificultad}`, { dificultad: undefined });
  (params.tiempo ?? "").split(",").filter(Boolean).forEach((t) =>
    chip(RANGOS_TIEMPO.find((r) => r.valor === t)?.texto ?? t, { tiempo: params.tiempo.split(",").filter((x) => x !== t).join(",") || undefined }));
  if (params.tiempoMax) chip(`Hasta ${params.tiempoMax} minutos`, { tiempoMax: undefined });
  if (params.conFoto) chip("Con fotografía", { conFoto: undefined });
  const caja = $("[data-activos]");
  caja.hidden = !chips.length;
  caja.innerHTML = chips.length ? `<span>Filtros activos:</span>${chips.join("")}<button class="enlace-terracota" type="button" data-limpiar>Limpiar filtros</button>` : "";
}

async function cargar() {
  rellenarFormulario();
  encabezado();
  chipsActivos();
  lista.innerHTML = cargando();
  const consulta = new URLSearchParams({ ...params, limit: POR_PAGINA });
  try {
    const r = await api(`/recetas?${consulta}`);
    const desde = r.total ? (r.page - 1) * r.limit + 1 : 0;
    const hasta = Math.min(r.page * r.limit, r.total);
    $("[data-conteo]").textContent = r.total
      ? `${r.total} ${r.total === 1 ? "receta encontrada" : "recetas encontradas"} · Mostrando ${desde}–${hasta}`
      : "Sin resultados";
    lista.innerHTML = r.items.length ? r.items.map((x) => tarjetaReceta(x)).join("")
      : estadoVacio("No encontramos recetas con esos filtros. Prueba quitando alguno o busca otro ingrediente.",
          `<a class="btn btn--secundario" href="recetas.html">Ver todas las recetas</a>`);
    $("[data-paginacion]").innerHTML = paginacion(r.page, r.paginas);
  } catch (err) {
    lista.innerHTML = estadoVacio(err.message);
    $("[data-paginacion]").innerHTML = "";
  }
}

function actualizar(cambios, { reemplazar = false } = {}) {
  params = reemplazar ? { ...cambios } : { ...params, ...cambios };
  Object.keys(params).forEach((k) => (params[k] === undefined || params[k] === "") && delete params[k]);
  history.pushState(null, "", `recetas.html${Object.keys(params).length ? `?${new URLSearchParams(params)}` : ""}`);
  cargar();
}

// Eventos
$("[data-buscar]").addEventListener("submit", (e) => {
  e.preventDefault();
  actualizar({ q: $("#q").value.trim() || undefined, nombre: undefined, page: undefined });
});
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const tiempos = [...form.querySelectorAll("[name=tiempo]:checked")].map((c) => c.value).join(",");
  actualizar({
    estado: form.estado.value || undefined,
    region: form.estado.value && form.estado.value === params.estado ? params.region : undefined,
    tipo: form.tipo.value || undefined, dificultad: form.dificultad.value || undefined,
    tiempo: tiempos || undefined, conFoto: form.conFoto.checked ? "1" : undefined, page: undefined,
  });
});
$("[data-activos]").addEventListener("click", (e) => {
  const q = e.target.closest("[data-quitar]");
  if (q) actualizar({ ...JSON.parse(q.dataset.quitar), page: undefined });
  if (e.target.closest("[data-limpiar]")) actualizar({ orden: params.orden }, { reemplazar: true });
});
$("[data-paginacion]").addEventListener("click", (e) => {
  const b = e.target.closest("[data-pagina]");
  if (!b || b.disabled) return;
  actualizar({ page: b.dataset.pagina === "1" ? undefined : b.dataset.pagina });
  window.scrollTo({ top: 0, behavior: "smooth" });
});
window.addEventListener("popstate", () => {
  params = Object.fromEntries([...new URLSearchParams(location.search)].filter(([k, v]) => CLAVES.includes(k) && v));
  cargar();
});

(async () => {
  try {
    estados = await api("/estados");
    form.estado.insertAdjacentHTML("beforeend", estados.map((e) => `<option value="${e.idEstado}">${esc(e.nomEstado)}</option>`).join(""));
  } catch { /* el listado mostrará el error */ }
  cargar();
})();
