// Página busqueda.html
import { api, esc } from "../nucleo/api.js";
import { TIEMPOS_MAXIMOS, TIPOS_PLATILLO, regionesDe } from "../nucleo/catalogos.js";
import { icon } from "../nucleo/icons.js";
import { montarLayout, ruta } from "../componentes/layout.js";

montarLayout("recetas");
const $ = (s) => document.querySelector(s);
$("[data-ruta]").outerHTML = ruta([["Inicio", "index.html"], ["Búsqueda avanzada"]]);
const form = $("[data-form]");
let ingredientes = [];
let estados = [];

form.tipo.insertAdjacentHTML("beforeend", TIPOS_PLATILLO.map((t) => `<option>${esc(t)}</option>`).join(""));
form.tiempoMax.insertAdjacentHTML("beforeend", TIEMPOS_MAXIMOS.map((m) => `<option value="${m}">${m} minutos</option>`).join(""));

function pintarIngredientes() {
  $("[data-ingredientes]").innerHTML = ingredientes.map((i, n) =>
    `<span class="chip">${esc(i)}<button class="chip__quitar" type="button" data-quitar="${n}" aria-label="Quitar ${esc(i)}">${icon("x", 14)}</button></span>`).join("");
}
function agregar() {
  const input = $("#ingrediente");
  input.value.split(",").map((s) => s.trim()).filter(Boolean).forEach((v) => {
    const bonito = v[0].toUpperCase() + v.slice(1).toLowerCase();
    if (!ingredientes.some((x) => x.toLowerCase() === v.toLowerCase())) ingredientes.push(bonito);
  });
  input.value = "";
  pintarIngredientes();
  input.focus();
}
$("[data-agregar]").addEventListener("click", agregar);
$("#ingrediente").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); agregar(); } });
$("[data-ingredientes]").addEventListener("click", (e) => {
  const b = e.target.closest("[data-quitar]");
  if (b) { ingredientes.splice(Number(b.dataset.quitar), 1); pintarIngredientes(); }
});

async function cargarRegiones() {
  const nombre = estados.find((e) => e.idEstado === Number(form.estado.value))?.nomEstado;
  let lista = [];
  if (nombre) lista = regionesDe(nombre, await api(`/recetas/regiones?estado=${form.estado.value}`).catch(() => []));
  form.region.innerHTML = `<option value="">Todas las regiones</option>` + lista.map((r) => `<option>${esc(r)}</option>`).join("");
  form.region.disabled = !nombre;
}
form.estado.addEventListener("change", cargarRegiones);

$("[data-limpiar]").addEventListener("click", () => {
  form.reset(); ingredientes = []; pintarIngredientes(); cargarRegiones();
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if ($("#ingrediente").value.trim()) agregar();
  const p = new URLSearchParams();
  const set = (k, v) => v && p.set(k, v);
  set("nombre", form.nombre.value.trim());
  set("ing", ingredientes.join(",").toLowerCase());
  if (ingredientes.length > 1) p.set("ingModo", form.todos.checked ? "todos" : "alguno");
  set("estado", form.estado.value); set("region", form.region.value);
  set("tipo", form.tipo.value); set("tiempoMax", form.tiempoMax.value);
  if (form.conFoto.checked) p.set("conFoto", "1");
  location.href = `recetas.html?${p}`;
});

estados = await api("/estados").catch(() => []);
form.estado.insertAdjacentHTML("beforeend", estados.map((e) => `<option value="${e.idEstado}">${esc(e.nomEstado)}</option>`).join(""));
cargarRegiones();
