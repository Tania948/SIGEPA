// Pantalla: Participar · Publicar receta (también edita recetas propias y borradores)
import { api, esc, parametro, requerirSesion, sesion } from "../nucleo/api.js";
import { DIFICULTADES, TIPOS_PLATILLO, UNIDADES, regionesDe } from "../nucleo/catalogos.js";
import { mostrarAlerta } from "../componentes/componentes.js";
import { hydrateIcons, icon } from "../nucleo/icons.js";
import { montarLayout, ruta } from "../componentes/layout.js";
import { borradores } from "../nucleo/local.js";
import { cargarMunicipios, contiene, crearAtlas } from "../componentes/mapa-mexico.js";
import { activarDictado, hayDictado } from "../componentes/dictado.js";

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

/* ---------- Solo portadores de saberes (tipoUsu 3) y administradores (1) publican ---------- */
if (u.tipoUsu === 2) {
  $("[data-puerta]").hidden = false;
  document.querySelector(".editor").hidden = true;
  $("[data-estado-doc]").hidden = true;
  $("[data-titulo]").textContent = "Comparte lo que se cocina en tu comunidad.";
  $("[data-hacerme-portador]").addEventListener("click", async (e) => {
    e.target.disabled = true;
    try {
      const r = await api("/usuarios/yo/portador", { metodo: "POST" });
      sesion.guardar(r, true);
      location.reload();
    } catch (err) {
      mostrarAlerta($("[data-alerta-puerta]"), err.message);
      e.target.disabled = false;
    }
  });
}
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
      ${unidades.map((x) => `<option${x === (i.unidad || (/gusto/i.test(i.cantidad ?? "") ? "—" : "g")) ? " selected" : ""}>${esc(x)}</option>`).join("")}
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
    <div class="entrada"><textarea aria-label="Instrucción" data-texto data-dictado rows="2" maxlength="1200" placeholder="Describe este paso">${esc(p.texto ?? "")}</textarea></div>
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
  const enlace = $("[data-foto-enlace]");
  if (/^https:\/\//.test(urlImagen)) { enlace.value = urlImagen; enlace.closest("details").open = true; }
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
$("[data-quitar-foto]").addEventListener("click", () => { urlImagen = ""; $("[data-foto-enlace]").value = ""; pintarFoto(); });
$("[data-foto-enlace]").addEventListener("change", (e) => {
  const v = e.target.value.trim();
  if (v && !/^https:\/\/\S+$/.test(v)) { mostrarAlerta(alerta, "El enlace de la foto debe empezar con https://"); return; }
  urlImagen = v;
  pintarFoto();
});

/* ---------- Lugar: estado, municipio (INEGI) y punto en el mapa ---------- */
const nombreEstado = () => estados.find((e) => e.idEstado === Number(form.idEstado.value))?.nomEstado ?? "";
let municipios = [];
// Si la cuenta aún no es de portador, el editor está oculto: no se crea el mapa (Leaflet necesita un contenedor visible).
const atlas = u.tipoUsu === 2
  ? { verPais() {}, async seleccionarEstado() {}, seleccionarMunicipio() {}, marcar() {} }
  : crearAtlas($("[data-mapa-elegir]"), { rueda: true, alClicMapa: (p) => marcarPunto(p.lat, p.lng) });

async function cargarRegiones() {
  const nombre = nombreEstado();
  const api_ = nombre ? await api(`/recetas/regiones?estado=${form.idEstado.value}`).catch(() => []) : [];
  $("#regiones").innerHTML = (nombre ? regionesDe(nombre, api_) : []).map((r) => `<option value="${esc(r)}">`).join("");
}
async function cargarMunicipiosEstado(cveElegida = "") {
  const id = Number(form.idEstado.value);
  form.cveMun.innerHTML = `<option value="">${id ? "Cargando municipios…" : "Primero elige el estado"}</option>`;
  if (!id) { atlas.verPais(); return; }
  municipios = (await cargarMunicipios(id)).features.map((f) => ({ cve: f.properties.cve, nombre: f.properties.nombre, geom: f.geometry }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  form.cveMun.innerHTML = `<option value="">Elige el municipio (${municipios.length})</option>`
    + municipios.map((m) => `<option value="${m.cve}">${esc(m.nombre)}</option>`).join("");
  form.cveMun.value = cveElegida;
  await atlas.seleccionarEstado(id, { acercar: !cveElegida });
  if (cveElegida) atlas.seleccionarMunicipio(cveElegida);
  pintarUbicacion();
}
function marcarPunto(lat, lng) {
  const m = municipios.find((x) => contiene(x.geom, lng, lat));
  if (!m) { mostrarAlerta(alerta, "Ese punto está fuera del estado elegido. Marca la localidad dentro del estado."); return; }
  alerta.hidden = true;
  form.latitud.value = lat.toFixed(4);
  form.longitud.value = lng.toFixed(4);
  form.cveMun.value = m.cve;
  atlas.seleccionarMunicipio(m.cve, { acercar: false });
  pintarUbicacion(); revisar();
}
function pintarUbicacion() {
  const mun = municipios.find((m) => m.cve === form.cveMun.value)?.nombre;
  const texto = [form.localidad.value.trim(), mun && mun !== form.localidad.value.trim() ? mun : null, nombreEstado()].filter(Boolean).join(", ");
  $("[data-ubicacion]").hidden = !form.localidad.value.trim() && !mun;
  $("[data-ubicacion-texto]").textContent = texto;
  const lat = Number(form.latitud.value); const lng = Number(form.longitud.value);
  atlas.marcar(form.latitud.value ? lat : null, form.longitud.value ? lng : null, form.localidad.value.trim());
}
form.idEstado.addEventListener("change", () => {
  form.latitud.value = ""; form.longitud.value = "";
  cargarRegiones(); cargarMunicipiosEstado();
});
form.cveMun.addEventListener("change", () => {
  if (form.cveMun.value) atlas.seleccionarMunicipio(form.cveMun.value);
  pintarUbicacion();
});
form.localidad.addEventListener("input", pintarUbicacion);
form.latitud.addEventListener("change", pintarUbicacion);
form.longitud.addEventListener("change", pintarUbicacion);
$("[data-cambiar-ubicacion]").addEventListener("click", () => $("[data-mapa-elegir]").scrollIntoView({ behavior: "smooth", block: "center" }));
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
    cveMun: form.cveMun.value || undefined,
    municipio: municipios.find((m) => m.cve === form.cveMun.value)?.nombre,
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
    nombreLengua: form.nombreLengua.value.trim() || undefined,
    lengua: form.lengua.value.trim() || undefined,
    historia: form.historia.value.trim() || undefined,
    consejo: form.consejo.value.trim() || undefined,
    licencia: form.licencia.value || "saber-comunitario",
    consentimiento: form.consentimiento.checked,
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
  form.nombreLengua.value = d.nombreLengua ?? "";
  form.lengua.value = d.lengua ?? "";
  form.historia.value = d.historia ?? "";
  form.consejo.value = d.consejo ?? "";
  form.licencia.value = d.licencia ?? "saber-comunitario";
  cajaIngredientes.innerHTML = "";
  (d.ingredientes?.length ? d.ingredientes : [{}, {}, {}]).forEach((i) => cajaIngredientes.appendChild(filaIngrediente(i)));
  cajaPasos.innerHTML = "";
  (d.pasos?.length ? d.pasos : [{}, {}]).forEach((p) => cajaPasos.appendChild(filaPaso(p)));
  numerar(); pintarFoto(); cargarRegiones(); cargarMunicipiosEstado(d.cveMun ?? "");
}

/* ---------- Lista "Antes de publicar" ---------- */
function revisar() {
  const d = leer();
  const ok = {
    historia: d.nombreReceta.length >= 3 && d.descripcion.length >= 20,
    foto: Boolean(d.urlImagen),
    lugar: Boolean(d.idEstado && d.cveMun && d.localidad),
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
  if (!ok.lugar) faltan.push("el estado, el municipio y la localidad");
  if (!ok.pasos) faltan.push("ingredientes con cantidad y al menos un paso");
  if (!ok.detalles) faltan.push("porciones y tiempo total");
  if (!d.dificultad || !d.tipoPlatillo) faltan.push("la dificultad y el tipo de platillo");
  if (!form.consentimiento.checked || !form.propia.checked || !form.terminos.checked) faltan.push("aceptar las tres casillas finales");
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

/* ---------- Dictado por voz ---------- */
activarDictado(form);
if (hayDictado) document.querySelectorAll("[data-ayuda-dictado]").forEach((e) => { e.hidden = false; });

/* ---------- Inicio ---------- */
(async () => {
  estados = await api("/estados").catch(() => []);
  // Lenguas del catálogo lengua de la base
  api("/recetas/catalogos").then((c) => {
    if (c.lenguas?.length) $("#lenguas").innerHTML = c.lenguas.map((l) => `<option value="${esc(l)}">`).join("");
  }).catch(() => {});
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
