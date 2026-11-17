// Pantalla: Inicio · Explorar México
import { api, esc } from "./api.js";
import { infoEstado } from "./catalogos.js";
import { activarFavoritos, estadoVacio, tarjetaReceta } from "./componentes.js";
import { montarLayout } from "./layout.js";
import { crearAtlas } from "./mapa-mexico.js";

montarLayout("explorar");

const $ = (s) => document.querySelector(s);
const select = $("[data-estado-select]");
const destacadas = $("[data-destacadas]");
activarFavoritos(destacadas);

document.querySelectorAll("[data-sugerencia]").forEach((b) =>
  b.addEventListener("click", () => { location.href = `recetas.html?q=${encodeURIComponent(b.dataset.sugerencia)}`; }));
$("[data-ver-estados]").addEventListener("click", (e) => { e.preventDefault(); select.focus(); select.showPicker?.(); });

let estados = [];
let puntos = [];
const porId = (id) => estados.find((e) => e.idEstado === Number(id));
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const recetasMun = (cve) => puntos.filter((p) => p.cveMun === cve);

const atlas = crearAtlas($("[data-mapa]"), {
  alSeleccionarEstado: (id) => elegir(id),
  alSeleccionarMunicipio: ({ cve, nombre, idEstado }) => elegirMunicipio(cve, nombre, idEstado),
  textoEstado: (id) => { const e = porId(id); return e ? `${e.nomEstado} · ${plural(e.totalRecetas, "receta", "recetas")}` : ""; },
  textoMunicipio: (cve, nombre) => `${nombre} · ${plural(recetasMun(cve).length, "receta", "recetas")}`,
});
$("[data-ver-pais]").addEventListener("click", () => { atlas.verPais(); $("[data-municipio]").hidden = true; });

function elegirMunicipio(cve, nombre, idEstado) {
  atlas.seleccionarMunicipio(cve);
  const lista = recetasMun(cve);
  const caja = $("[data-municipio]");
  caja.hidden = false;
  $("[data-mun-nombre]").textContent = nombre;
  $("[data-mun-texto]").textContent = lista.length
    ? `${plural(lista.length, "receta compartida", "recetas compartidas")}: ${lista.map((r) => r.nombreReceta).join(", ")}.`
    : "Todavía no hay recetas de este municipio. ¿Conoces una?";
  const enlace = $("[data-mun-enlace]");
  enlace.textContent = lista.length ? "Ver recetas del municipio →" : "Compartir una receta →";
  enlace.href = lista.length ? `recetas.html?estado=${idEstado}&mun=${cve}&munNombre=${encodeURIComponent(nombre)}` : "publicar.html";
}

async function elegir(idEstado) {
  select.value = String(idEstado);
  $("[data-municipio]").hidden = true;
  history.replaceState(null, "", `?estado=${idEstado}`);
  atlas.seleccionarEstado(idEstado);

  const [estado, recetas] = await Promise.all([api(`/estados/${idEstado}`), api(`/recetas?estado=${idEstado}&limit=3`)]);
  const info = infoEstado(estado.nomEstado);
  $("[data-zona]").textContent = info.zona;
  $("[data-nombre-estado]").textContent = estado.nomEstado;
  $("[data-descripcion]").textContent = info.intro;
  const chips = info.temas.length
    ? info.temas.map(([t, q]) => `<a class="chip" href="recetas.html?estado=${idEstado}${q ? `&q=${encodeURIComponent(q)}` : ""}">${esc(t)}</a>`)
    : estado.regiones.map((r) => `<a class="chip" href="recetas.html?estado=${idEstado}&region=${encodeURIComponent(r.region)}">${esc(r.region)}</a>`);
  $("[data-regiones]").innerHTML = chips.join("");
  const explorar = $("[data-explorar]");
  explorar.href = `estado.html?id=${idEstado}`;
  explorar.querySelector("span").textContent = `Explorar recetas de ${estado.nomEstado}`;

  $("#titulo-destacadas").textContent = `De ${estado.nomEstado} a tu cocina`;
  $("[data-ver-recetas]").href = `recetas.html?estado=${idEstado}`;
  destacadas.innerHTML = recetas.items.length
    ? recetas.items.map((r) => tarjetaReceta(r)).join("")
    : estadoVacio(`Todavía no hay recetas de ${estado.nomEstado}. ¡Puedes ser la primera persona en compartir una!`,
        `<a class="btn btn--primario" href="publicar.html">Publicar una receta</a>`);
}

async function iniciar() {
  try {
    [estados, puntos] = await Promise.all([api("/estados"), api("/recetas/mapa")]);
  } catch (err) {
    destacadas.innerHTML = estadoVacio(err.message);
    return;
  }
  atlas.mostrarPuntos(puntos);
  select.innerHTML = estados.map((e) => `<option value="${e.idEstado}">${esc(e.nomEstado)}</option>`).join("");
  select.addEventListener("change", () => elegir(select.value));
  const inicial = Number(new URLSearchParams(location.search).get("estado")) || 20;
  elegir(inicial);
}
iniciar();
