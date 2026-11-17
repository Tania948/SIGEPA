// Pantalla: Inicio · Explorar México
import { api, esc } from "./api.js";
import { activarFavoritos, estadoVacio, tarjetaReceta } from "./componentes.js";
import { montarLayout } from "./layout.js";
import { crearMapa } from "./mapa.js";
import { infoEstado } from "./catalogos.js";

montarLayout("explorar");

const $ = (s) => document.querySelector(s);
const select = $("[data-estado-select]");
const destacadas = $("[data-destacadas]");
activarFavoritos(destacadas);

// Sugerencias de búsqueda
document.querySelectorAll("[data-sugerencia]").forEach((b) =>
  b.addEventListener("click", () => { location.href = `recetas.html?q=${encodeURIComponent(b.dataset.sugerencia)}`; }));
$("[data-ver-estados]").addEventListener("click", (e) => { e.preventDefault(); select.focus(); select.showPicker?.(); });

let estados = [];
const porNombre = (n) => estados.find((e) => e.nomEstado === n);

const mapa = crearMapa($("[data-mapa]"), {
  alSeleccionar: (nombre) => { const e = porNombre(nombre); if (e) elegir(e.idEstado); },
  textoTooltip: (nombre) => {
    const e = porNombre(nombre);
    if (!e) return nombre;
    return `${nombre} · ${e.totalRecetas} ${e.totalRecetas === 1 ? "receta" : "recetas"}`;
  },
});

async function elegir(idEstado) {
  select.value = String(idEstado);
  const resumen = estados.find((e) => e.idEstado === Number(idEstado));
  mapa.seleccionar(resumen?.nomEstado);
  history.replaceState(null, "", `?estado=${idEstado}`);

  const [estado, recetas] = await Promise.all([
    api(`/estados/${idEstado}`),
    api(`/recetas?estado=${idEstado}&limit=3`),
  ]);

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
    estados = await api("/estados");
  } catch (err) {
    destacadas.innerHTML = estadoVacio(err.message);
    return;
  }
  select.innerHTML = estados.map((e) => `<option value="${e.idEstado}">${esc(e.nomEstado)}</option>`).join("");
  select.addEventListener("change", () => elegir(select.value));
  const inicial = Number(new URLSearchParams(location.search).get("estado"))
    || porNombre("Oaxaca")?.idEstado || estados[0]?.idEstado;
  if (inicial) elegir(inicial);
}
iniciar();
