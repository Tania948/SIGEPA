// Pantalla: Participar · Publicar receta (también edita recetas propias y borradores)
import { api, esc, parametro, requerirSesion, sesion } from "./api.js";
import { DIFICULTADES, TIPOS_PLATILLO, UNIDADES, regionesDe } from "./catalogos.js";
import { mostrarAlerta } from "./componentes.js";
import { hydrateIcons, icon } from "./icons.js";
import { montarLayout, ruta } from "./layout.js";
import { borradores } from "./local.js";

montarLayout("publicar");
if (!requerirSesion()) throw new Error("Sin sesión");

const $ = (s, r = document) => r.querySelector(s);
const form = $("[data-form]");
const alerta = $("[data-alerta]");
const idReceta = Number(parametro("id")) || null;
let idBorrador = parametro("borrador");
let urlImagen = "";
let estados = [];

$("[data-ruta]").outerHTML = ruta([["Inicio", "index.html"], ["Mi perfil", "mi-perfil.html"], [idReceta ? "Editar receta" : "Publicar receta"]]);
const u = sesion.usuario;
$("[data-publicando]").textContent = `Publicando como ${[u.nombre, u.apPat].filter(Boolean).join(" ")}`;
form.dificultad.insertAdjacentHTML("beforeend", DIFICULTADES.map((d) => `<option>${d}</option>`).join(""));
form.tipoPlatillo.insertAdjacentHTML("beforeend", TIPOS_PLATILLO.map((d) => `<option>${d}</option>`).join(""));

/* ---------- Ingredientes ---------- */
function filaIngrediente(i = {}) {
  const unidades = UNIDADES.includes(i.unidad || "") || !i.unidad ? UNIDADES : [i.unidad, ...UNIDADES];
  const div = document.createElement("div");
  div.className = "ingrediente-fila";
  div.innerHTML = `
    <div class="entrada entrada--compacta"><input aria-label="Cantidad" data-cantidad maxlength="15" value="${esc(i.cantidad ?? "")}" placeholder="200"></div>
    <div class="entrada entrada--compacta"><select aria-label="Unidad" data-unidad>
      ${unidades.map((x) => `<option${x === (i.unidad || "g") ? " selected" : ""}>${esc(x)}</option>`).join("")}
    </select>${icon("chevron-down", 14)}</div>
    <div class="entrada entrada--compacta"><input aria-label="Ingrediente" data-nombre maxlength="80" value="${esc(i.nombre ?? "")}" placeholder="guías tiernas de calabaza"></div>
    <button class="btn-basura" type="button" data-quitar aria-label="Quitar ingrediente">${icon("trash-2", 18)}</button>`;
  return div;
}
const cajaIngredientes = $("[data-ingredientes]");
$("[data-agregar-ingrediente]").addEventListener("click", () => {
  const f = filaIngrediente();
  cajaIngredientes.appendChild(f);
  $("[data-cantidad]", f).focus();
});
cajaIngredientes.addEventListener("click", (e) => {
  const q = e.target.closest("[data-quitar]");
  if (!q) return;
  q.parentElement.remove();
  if (!cajaIngredientes.children.length) cajaIngredientes.appendChild(filaIngrediente());
  revisar();
});

/* ---------- Pasos (con arrastrar y soltar) ---------- */
const cajaPasos = $("[data-pasos]");
function filaPaso(p = {}) {
  const div = document.createElement("div");
  div.className = "paso-fila";
  div.draggable = true;
  div.innerHTML = `
    <span class="paso-num" data-num></span>
    <div class="entrada"><textarea aria-label="Instrucción" data-texto rows="2" maxlength="1200" placeholder="Describe este paso">${esc(p.texto ?? "")}</textarea></div>
    <span class="agarre" title="Arrastra para reordenar" aria-hidden="true">${icon("grip-vertical", 18)}</span>
    <button class="btn-basura" type="button" data-quitar aria-label="Quitar paso">${icon("trash-2", 18)}</button>`;
  if (p.titulo) div.dataset.titulo = p.titulo;
  return div;
}
const numerar = () => cajaPasos.querySelectorAll("[data-num]").forEach((n, i) => { n.textContent = i + 1; });
$("[data-agregar-paso]").addEventListener("click", () => {
  const f = filaPaso();
  cajaPasos.appendChild(f);
  numerar();
  $("[data-texto]", f).focus();
});
cajaPasos.addEventListener("click", (e) => {
  const q = e.target.closest("[data-quitar]");
  if (!q) return;
  q.parentElement.remove();
  if (!cajaPasos.children.length) cajaPasos.appendChild(filaPaso());
  numerar(); revisar();
});
let arrastrando = null;
cajaPasos.addEventListener("dragstart", (e) => {
  if (e.target.matches("textarea")) { e.preventDefault(); return; }
  arrastrando = e.target.closest(".paso-fila");
  arrastrando?.classList.add("paso-fila--arrastrando");
});
cajaPasos.addEventListener("dragend", () => { arrastrando?.classList.remove("paso-fila--arrastrando"); arrastrando = null; numerar(); });
cajaPasos.addEventListener("dragover", (e) => {
  e.preventDefault();
  const sobre = e.target.closest(".paso-fila");
  if (!arrastrando || !sobre || sobre === arrastrando) return;
  const caja = sobre.getBoundingClientRect();
  cajaPasos.insertBefore(arrastrando, e.clientY > caja.top + caja.height / 2 ? sobre.nextSibling : sobre);
});

/* ---------- Fotografía ---------- */
function pintarFoto() {
  $("[data-foto]").hidden = !urlImagen;
  if (urlImagen) $("[data-foto-img]").src = urlImagen;
  $("[data-subir-texto]").textContent = urlImagen ? "Cambiar fotografía" : "Agregar fotografía";
  revisar();
}
async function subir(archivo) {
  if (!archivo) return;
  if (!/^image\/(jpeg|png)$/.test(archivo.type)) return mostrarAlerta(alerta, "La fotografía debe ser JPG o PNG.");
  if (archivo.size > 10 * 1024 * 1024) return mostrarAlerta(alerta, "La fotografía pesa más de 10 MB.");
  const datos = new FormData();
  datos.append("foto", archivo);
  $("[data-subir-texto]").textContent = "Subiendo…";
  try {
    urlImagen = (await api("/uploads", { metodo: "POST", archivo: datos })).url;
  } catch (err) {
    mostrarAlerta(alerta, err.message);
  }
  pintarFoto();
}
$("[data-archivo]").addEventListener("change", (e) => subir(e.target.files[0]));
const zona = $("[data-subir]");
["dragenter", "dragover"].forEach((t) => zona.addEventListener(t, (e) => { e.preventDefault(); zona.classList.add("subir-foto--arrastre"); }));
["dragleave", "drop"].forEach((t) => zona.addEventListener(t, () => zona.classList.remove("subir-foto--arrastre")));
zona.addEventListener("drop", (e) => { e.preventDefault(); subir(e.dataTransfer.files[0]); });
$("[data-quitar-foto]").addEventListener("click", () => { urlImagen = ""; pintarFoto(); });

/* ---------- Lugar ---------- */
const nombreEstado = () => estados.find((e) => e.idEstado === Number(form.idEstado.value))?.nomEstado ?? "";
async function cargarRegiones() {
  const nombre = nombreEstado();
  const api_ = nombre ? await api(`/recetas/regiones?estado=${form.idEstado.value}`).catch(() => []) : [];
  $("#regiones").innerHTML = (nombre ? regionesDe(nombre, api_) : []).map((r) => `<option value="${esc(r)}">`).join("");
}
function pintarUbicacion() {
  const texto = [form.localidad.value.trim(), nombreEstado()].filter(Boolean).join(", ");
  $("[data-ubicacion]").hidden = !form.localidad.value.trim();
  $("[data-ubicacion-texto]").textContent = texto;
}
form.idEstado.addEventListener("change", () => { cargarRegiones(); pintarUbicacion(); });
form.localidad.addEventListener("input", pintarUbicacion);
$("[data-cambiar-ubicacion]").addEventListener("click", () => form.localidad.focus());
$("#nombreReceta").addEventListener("input", (e) => {
  $("[data-contador-nombre]").textContent = `${e.target.value.length} de 30 caracteres.`;
});

/* ---------- Leer y llenar el formulario ---------- */
function leer() {
  const num = (v) => (v === "" || v == null ? undefined : Number(v));
  return {
    nombreReceta: form.nombreReceta.value.trim(),
    descripcion: form.descripcion.value.trim(),
    urlImagen: urlImagen || undefined,
    idEstado: num(form.idEstado.value),
    region: form.region.value.trim() || undefined,
    localidad: form.localidad.value.trim() || undefined,
    latitud: num(form.latitud.value),
    longitud: num(form.longitud.value),
    ingredientes: [...cajaIngredientes.children].map((f) => ({
      cantidad: $("[data-cantidad]", f).value.trim(), unidad: $("[data-unidad]", f).value, nombre: $("[data-nombre]", f).value.trim(),
    })).filter((i) => i.nombre || i.cantidad),
    pasos: [...cajaPasos.children].map((f) => ({ titulo: f.dataset.titulo || undefined, texto: $("[data-texto]", f).value.trim() })).filter((p) => p.texto),
    porciones: num(form.porciones.value),
    tiempoTotal: num(form.tiempoTotal.value),
    dificultad: form.dificultad.value || undefined,
    tipoPlatillo: form.tipoPlatillo.value || undefined,
  };
}

function llenar(d) {
  form.nombreReceta.value = d.nombreReceta ?? "";
  form.descripcion.value = d.descripcion ?? "";
  urlImagen = d.urlImagen ?? "";
  form.idEstado.value = d.idEstado ?? d.estado?.idEstado ?? "";
  form.region.value = d.region ?? "";
  form.localidad.value = d.localidad ?? "";
  form.latitud.value = d.latitud ?? "";
  form.longitud.value = d.longitud ?? "";
  form.porciones.value = d.porciones ?? "";
  form.tiempoTotal.value = d.tiempoTotal ?? "";
  form.dificultad.value = d.dificultad ?? "";
  form.tipoPlatillo.value = d.tipoPlatillo ?? "";
  cajaIngredientes.innerHTML = "";
  (d.ingredientes?.length ? d.ingredientes : [{}, {}, {}]).forEach((i) => cajaIngredientes.appendChild(filaIngrediente(i)));
  cajaPasos.innerHTML = "";
  (d.pasos?.length ? d.pasos : [{}, {}]).forEach((p) => cajaPasos.appendChild(filaPaso(p)));
  numerar(); pintarFoto(); cargarRegiones(); pintarUbicacion();
}

/* ---------- Lista "Antes de publicar" ---------- */
function revisar() {
  const d = leer();
  const ok = {
    historia: d.nombreReceta.length >= 3 && d.descripcion.length >= 20,
    foto: Boolean(d.urlImagen),
    lugar: Boolean(d.idEstado && d.localidad),
    pasos: d.ingredientes.some((i) => i.nombre && i.cantidad) && d.pasos.length > 0,
    detalles: Boolean(d.porciones && d.tiempoTotal),
  };
  Object.entries(ok).forEach(([k, v]) => $(`[data-r="${k}"]`).classList.toggle("cumple", v));
  return ok;
}
form.addEventListener("input", revisar);
form.addEventListener("change", revisar);

/* ---------- Guardar borrador (en este navegador) ---------- */
$("[data-guardar-borrador]").addEventListener("click", () => {
  const d = leer();
  if (!d.nombreReceta) return mostrarAlerta(alerta, "Escribe al menos el nombre de la receta para guardar el borrador.");
  idBorrador = borradores.guardar({ ...d, idReceta }, idBorrador);
  history.replaceState(null, "", `publicar.html?borrador=${idBorrador}${idReceta ? `&id=${idReceta}` : ""}`);
  mostrarAlerta(alerta, "Borrador guardado en este dispositivo. Lo encuentras en Mi perfil → Mis recetas.", "ok");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ---------- Publicar ---------- */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const d = leer();
  const ok = revisar();
  const faltan = [];
  if (!ok.historia) faltan.push("el nombre y una descripción de al menos 20 caracteres");
  if (!ok.foto) faltan.push("una fotografía");
  if (!ok.lugar) faltan.push("el estado y la localidad");
  if (!ok.pasos) faltan.push("ingredientes con cantidad y al menos un paso");
  if (!ok.detalles) faltan.push("porciones y tiempo total");
  if (!d.dificultad || !d.tipoPlatillo) faltan.push("la dificultad y el tipo de platillo");
  if (!form.propia.checked || !form.terminos.checked) faltan.push("aceptar las dos casillas finales");
  if (faltan.length) {
    mostrarAlerta(alerta, `Antes de publicar, completa: ${faltan.join("; ")}.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const btn = $("[data-publicar]");
  btn.disabled = true;
  try {
    const r = await api(idReceta ? `/recetas/${idReceta}` : "/recetas", { metodo: idReceta ? "PUT" : "POST", cuerpo: d });
    if (idBorrador) borradores.eliminar(idBorrador);
    location.href = `receta.html?id=${r.idReceta}`;
  } catch (err) {
    mostrarAlerta(alerta, err.message);
    window.scrollTo({ top: 0, behavior: "smooth" });
    btn.disabled = false;
  }
});

/* ---------- Inicio ---------- */
(async () => {
  estados = await api("/estados").catch(() => []);
  form.idEstado.insertAdjacentHTML("beforeend", estados.map((e) => `<option value="${e.idEstado}">${esc(e.nomEstado)}</option>`).join(""));
  let datos = { idEstado: Number(parametro("estado")) || undefined };
  if (idBorrador && borradores.obtener(idBorrador)) {
    datos = borradores.obtener(idBorrador).datos;
  } else if (idReceta) {
    try {
      datos = await api(`/recetas/${idReceta}`);
      $("[data-estado-doc]").textContent = datos.estadoValidacion === "validada" ? "Publicada · Al guardar vuelve a revisión"
        : datos.estadoValidacion === "rechazada" ? "Requiere cambios" : "En revisión";
      $("[data-estado-doc]").classList.add("estado-documento--revision");
    } catch (err) {
      mostrarAlerta(alerta, err.message);
    }
  }
  if (idReceta) {
    $("[data-titulo]").textContent = "Actualiza tu receta.";
    $("[data-publicar]").innerHTML = `${icon("check", 18)}Guardar cambios`;
  }
  llenar(datos);
  hydrateIcons();
  revisar();
})();
