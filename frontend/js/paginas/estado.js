// Página estado.html
import { api, esc, parametro } from "../nucleo/api.js";
import { crearAtlas } from "../componentes/mapa-mexico.js";
import { icon } from "../nucleo/icons.js";
import { pintarFotosFijas } from "../nucleo/fotos.js";
import { DIFICULTADES, RANGOS_TIEMPO, TIPOS_PLATILLO, infoEstado, regionesDe } from "../nucleo/catalogos.js";
import { activarFavoritos, cargando, estadoVacio, paginacion, pildoraMenu, tarjetaReceta } from "../componentes/componentes.js";
import { montarLayout, ruta } from "../componentes/layout.js";

montarLayout("explorar");
const $ = (s) => document.querySelector(s);
const lista = $("[data-lista]");
activarFavoritos(lista);

const estados = await api("/estados").catch(() => []);
const id = Number(parametro("id")) || estados.find((e) => e.nomEstado === "Oaxaca")?.idEstado;
const estado = estados.find((e) => e.idEstado === id);
if (!estado) {
  document.querySelector("main").innerHTML = `<div class="vacio">No encontramos ese estado. <a class="enlace" href="index.html">Volver al mapa →</a></div>`;
  throw new Error("Estado no encontrado");
}
const info = infoEstado(estado.nomEstado);
document.title = `${estado.nomEstado} · SIGEPA MX`;
$("[data-ruta]").outerHTML = ruta([["Inicio", "index.html"], ["Estados de México", "index.html#territorio"], [estado.nomEstado]]);
$("[data-volver]").href = `index.html?estado=${id}#territorio`;

// Portada del estado
$("[data-zona]").textContent = `MÉXICO / ${info.zona}`;
$("[data-nombre]").textContent = estado.nomEstado;
$("[data-texto]").textContent = info.texto;
$("[data-etiquetas]").innerHTML = info.etiquetas.map(esc).join(" <span>·</span> ");
if (info.imagen) {
  $("[data-hero]").insertAdjacentHTML("beforeend", `<img data-foto="${esc(info.imagen)}" data-credito alt="">`);
  pintarFotosFijas($("[data-hero]"));
}
else $("[data-hero]").classList.add("estado-hero--sin-foto");

// Buscador y cambio de estado
const select = $("[data-select]");
select.innerHTML = estados.map((e) => `<option value="${e.idEstado}"${e.idEstado === id ? " selected" : ""}>${esc(e.nomEstado)}</option>`).join("");
select.addEventListener("change", () => { location.href = `estado.html?id=${select.value}`; });
$("#q").placeholder = `Busca un platillo o ingrediente en ${estado.nomEstado}`;
$("[data-buscar-btn]").textContent = `Buscar en ${estado.nomEstado}`;
$("[data-titulo-lista]").textContent = `Sabores compartidos desde ${estado.nomEstado}`;
$("[data-invitacion]").textContent = `Ayúdanos a contar ${estado.nomEstado} desde tu mesa. Comparte una receta y el lugar al que pertenece.`;

// Filtros
const filtros = { region: "", tipo: "", tiempo: "", dificultad: "", conFoto: "", orden: "", q: "", mun: "", page: 1 };
let munNombre = "";
const regiones = regionesDe(estado.nomEstado, await api(`/recetas/regiones?estado=${id}`).catch(() => []));
const caja = $("[data-filtros]");
const al = (k) => (v) => { filtros[k] = v; filtros.page = 1; cargar(); };
pildoraMenu(caja, { etiqueta: "Todas las regiones", opciones: [{ valor: "", texto: "Todas las regiones" }, ...regiones.map((r) => ({ valor: r, texto: r }))], alCambiar: al("region") });
pildoraMenu(caja, { etiqueta: "Tipo de platillo", opciones: [{ valor: "", texto: "Todos los tipos" }, ...TIPOS_PLATILLO.map((t) => ({ valor: t, texto: t }))], alCambiar: al("tipo") });
pildoraMenu(caja, { etiqueta: "Tiempo", opciones: [{ valor: "", texto: "Cualquier tiempo" }, ...RANGOS_TIEMPO.map((r) => ({ valor: r.valor, texto: r.texto }))], alCambiar: al("tiempo") });
pildoraMenu(caja, { etiqueta: "Dificultad", opciones: [{ valor: "", texto: "Cualquier dificultad" }, ...DIFICULTADES.map((d) => ({ valor: d, texto: d }))], alCambiar: al("dificultad") });
const foto = document.createElement("button");
foto.type = "button";
foto.className = "pildora";
foto.textContent = "Con fotografía";
foto.setAttribute("aria-pressed", "false");
foto.addEventListener("click", () => {
  filtros.conFoto = filtros.conFoto ? "" : "1";
  foto.classList.toggle("pildora--activa", Boolean(filtros.conFoto));
  foto.setAttribute("aria-pressed", String(Boolean(filtros.conFoto)));
  filtros.page = 1; cargar();
});
caja.appendChild(foto);
pildoraMenu($("[data-orden]"), {
  etiqueta: "Más recientes", estilo: "texto", alinear: "derecha",
  opciones: [{ valor: "", texto: "Más recientes" }, { valor: "antiguas", texto: "Más antiguas" }, { valor: "tiempo", texto: "Menor tiempo" }, { valor: "nombre", texto: "Nombre (A–Z)" }],
  alCambiar: al("orden"),
});
$("[data-buscar]").addEventListener("submit", (e) => { e.preventDefault(); filtros.q = $("#q").value.trim(); filtros.page = 1; cargar(); });
$("[data-paginacion]").addEventListener("click", (e) => {
  const b = e.target.closest("[data-pagina]");
  if (b && !b.disabled) { filtros.page = Number(b.dataset.pagina); cargar(); $("[data-titulo-lista]").scrollIntoView({ behavior: "smooth" }); }
});

// Mapa de municipios del estado
const puntos = await api(`/recetas/mapa?estado=${id}`).catch(() => []);
const deMun = (cve) => puntos.filter((p) => p.cveMun === cve).length;
const atlas = crearAtlas($("[data-mapa-estado]"), {
  soloEstado: id,
  textoMunicipio: (cve, nombre) => `${nombre} · ${deMun(cve)} ${deMun(cve) === 1 ? "receta" : "recetas"}`,
  alSeleccionarMunicipio: ({ cve, nombre }) => {
    atlas.seleccionarMunicipio(cve);
    filtros.mun = cve; munNombre = nombre; filtros.page = 1;
    pintarChipMunicipio(); cargar();
    $("[data-titulo-lista]").scrollIntoView({ behavior: "smooth", block: "start" });
  },
});
atlas.seleccionarEstado(id).then(() => atlas.mostrarPuntos(puntos));
function pintarChipMunicipio() {
  caja.querySelector("[data-chip-mun]")?.remove();
  if (!filtros.mun) return;
  caja.insertAdjacentHTML("afterbegin", `<span class="chip" data-chip-mun>Municipio: ${esc(munNombre)}<button class="chip__quitar" type="button" aria-label="Quitar municipio">${icon("x", 14)}</button></span>`);
  caja.querySelector("[data-chip-mun] button").addEventListener("click", () => {
    filtros.mun = ""; munNombre = ""; pintarChipMunicipio(); cargar(); atlas.seleccionarEstado(id);
  });
}

async function cargar() {
  lista.innerHTML = cargando();
  const p = new URLSearchParams({ estado: id, limit: 6 });
  Object.entries(filtros).forEach(([k, v]) => v && p.set(k, v));
  try {
    const r = await api(`/recetas?${p}`);
    $("[data-conteo]").textContent = `${r.total} ${r.total === 1 ? "receta" : "recetas"} · ${munNombre || filtros.region || "Todas las regiones"}`;
    lista.innerHTML = r.items.length ? r.items.map((x) => tarjetaReceta(x)).join("")
      : estadoVacio(`Todavía no hay recetas de ${estado.nomEstado} con estos filtros.`,
          `<a class="btn btn--primario" href="publicar.html?estado=${id}">Aportar una receta</a>`);
    $("[data-paginacion]").innerHTML = paginacion(r.page, r.paginas);
  } catch (err) {
    lista.innerHTML = estadoVacio(err.message);
  }
}
$("[data-aportar]").href = `publicar.html?estado=${id}`;
cargar();
