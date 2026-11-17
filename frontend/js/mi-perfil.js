// Pantalla: Mi perfil · Mis aportes / Mis favoritos
import { api, esc, parametro, requerirSesion, sesion } from "./api.js";
import { TIPOS_PLATILLO } from "./catalogos.js";
import {
  activarFavoritos, activarOpciones, avatar, cargando, estadoVacio, mostrarAlerta, pildoraMenu, tarjetaReceta,
} from "./componentes.js";
import { icon } from "./icons.js";
import { montarLayout, ruta } from "./layout.js";
import { borradores, favoritos } from "./local.js";

montarLayout("perfil");
if (!requerirSesion()) throw new Error("Sin sesión");
const $ = (s) => document.querySelector(s);
const pestana = parametro("pestana") === "favoritos" ? "favoritos" : "recetas";

$("[data-ruta]").outerHTML = ruta([["Inicio", "index.html"], ["Mi perfil", "mi-perfil.html"], [pestana === "favoritos" ? "Favoritos" : "Mis recetas"]]);
document.querySelectorAll("[data-pestana]").forEach((a) => { if (a.dataset.pestana === pestana) a.setAttribute("aria-current", "page"); });
$(`[data-vista="${pestana}"]`).hidden = false;

/* ---------- Tarjeta de perfil ---------- */
let yo = null;
let misRecetas = [];
function pintarPerfil() {
  const nombre = [yo.nombre, yo.apPat, yo.apMat].filter(Boolean).join(" ");
  $("[data-avatar]").outerHTML = `<span data-avatar>${avatar(nombre, 108, "avatar--serif")}</span>`;
  $("[data-nombre]").textContent = nombre;
  $("[data-correo]").textContent = `${yo.email} · Solo tú puedes ver tu correo`;
  // Procedencia: el estado donde más recetas ha compartido (el diccionario no guarda dirección).
  const cuenta = {};
  misRecetas.forEach((r) => { const n = [r.localidad, r.estado.nomEstado].filter(Boolean).join(", "); cuenta[n] = (cuenta[n] ?? 0) + 1; });
  const lugar = Object.entries(cuenta).sort((a, b) => b[1] - a[1])[0]?.[0];
  $("[data-lugar]").hidden = !lugar;
  $("[data-lugar]").textContent = lugar ?? "";
}

/* ---------- Mis aportes ---------- */
const cajaMis = $("[data-mis-recetas]");
let filtroAportes = "todas";
function pintarAportes() {
  const locales = borradores.todos().map((b) => ({
    ...b.datos, idReceta: null, idBorrador: b.id, estadoValidacion: "borrador",
    estado: { nomEstado: b.datos.idEstado ? estadosPorId[b.datos.idEstado] ?? "" : "" },
    autor: { nombre: [yo.nombre, yo.apPat].join(" ") },
  }));
  const publicadas = misRecetas.filter((r) => r.estadoValidacion === "validada");
  const todas = [...locales, ...misRecetas];
  const lista = { todas, publicadas, borradores: locales }[filtroAportes];
  $("[data-n-recetas]").textContent = todas.length;

  $("[data-filtro-aportes]").innerHTML = [
    ["todas", `Todas (${todas.length})`], ["publicadas", `Publicadas (${publicadas.length})`], ["borradores", `Borradores (${locales.length})`],
  ].map(([v, t]) => `<button type="button" class="pildora${v === filtroAportes ? " pildora--activa" : ""}" data-filtro="${v}">${t}</button>`).join("")
    + `<p class="texto-xs">Los borradores solo son visibles para ti y se guardan en este dispositivo.</p>`;

  cajaMis.innerHTML = lista.length
    ? lista.map((r) => tarjetaReceta(r, { modo: "propia", enlaceEditar: r.idBorrador ? `publicar.html?borrador=${r.idBorrador}${r.idReceta ? `&id=${r.idReceta}` : ""}` : undefined })).join("")
    : estadoVacio(filtroAportes === "borradores" ? "No tienes borradores guardados." : "Todavía no compartes recetas. ¡Tu cocina también es parte del mapa!",
        `<a class="btn btn--primario" href="publicar.html">Publicar receta</a>`);

  const b = locales[0];
  $("[data-banda-borrador]").innerHTML = b ? `
    <section class="banda banda--rosa">
      <div class="banda__mensaje">${icon("notebook-pen", 30)}<div>
        <h2>Tu ${esc(b.nombreReceta.charAt(0).toLowerCase() + b.nombreReceta.slice(1))} está casi lista para compartir.</h2>
        <p>Revisa los ingredientes y los pasos antes de publicarla. Puedes seguir editando cuando quieras.</p></div></div>
      <a class="btn btn--secundario" href="publicar.html?borrador=${b.idBorrador}">Continuar borrador</a>
    </section>` : "";
}
$("[data-filtro-aportes]").addEventListener("click", (e) => {
  const b = e.target.closest("[data-filtro]");
  if (b) { filtroAportes = b.dataset.filtro; pintarAportes(); }
});
activarOpciones(cajaMis, {
  alEliminar: async (id) => {
    if (String(id).startsWith("b")) {
      borradores.eliminar(id);
    } else {
      const r = misRecetas.find((x) => x.idReceta === Number(id));
      if (!confirm(`¿Eliminar “${r?.nombreReceta}”? Esta acción no se puede deshacer.`)) return;
      try { await api(`/recetas/${id}`, { metodo: "DELETE" }); } catch (err) { alert(err.message); return; }
      misRecetas = misRecetas.filter((x) => x.idReceta !== Number(id));
    }
    pintarAportes();
  },
});

/* ---------- Favoritos ---------- */
const cajaFav = $("[data-favoritos]");
let recetasFav = [];
const filtrosFav = { estado: "", tipo: "", orden: "" };
function pintarFavoritos() {
  const ids = favoritos.ids();
  let lista = recetasFav.filter((r) => ids.includes(r.idReceta));
  $("[data-n-favoritos]").textContent = lista.length;
  $("[data-total-fav]").textContent = `${lista.length} ${lista.length === 1 ? "receta favorita" : "recetas favoritas"}`;
  if (filtrosFav.estado) lista = lista.filter((r) => String(r.estado.idEstado) === filtrosFav.estado);
  if (filtrosFav.tipo) lista = lista.filter((r) => r.tipoPlatillo === filtrosFav.tipo);
  const pos = (r) => ids.indexOf(r.idReceta);
  lista.sort(filtrosFav.orden === "nombre" ? (a, b) => a.nombreReceta.localeCompare(b.nombreReceta, "es")
    : filtrosFav.orden === "antiguas" ? (a, b) => pos(b) - pos(a) : (a, b) => pos(a) - pos(b));
  cajaFav.innerHTML = lista.length ? lista.map((r) => tarjetaReceta(r, { modo: "favorito" })).join("")
    : estadoVacio(ids.length ? "Ninguna receta guardada coincide con estos filtros." : "Aún no guardas recetas. Usa el marcador de cualquier receta para traerla aquí.",
        `<a class="btn btn--primario" href="recetas.html">Explorar recetas</a>`);
}
activarFavoritos(cajaFav, { alQuitar: () => pintarFavoritos() });

/* ---------- Editar perfil (columnas del diccionario: nombre, apPat, apMat, email) ---------- */
const dialogo = $("[data-dialogo]");
const formPerfil = $("[data-form-perfil]");
$("[data-editar]").addEventListener("click", () => {
  ["nombre", "apPat", "apMat", "email"].forEach((k) => { formPerfil[k].value = yo[k] ?? ""; });
  $("[data-alerta-perfil]").hidden = true;
  dialogo.showModal();
});
$("[data-cancelar]").addEventListener("click", () => dialogo.close());
formPerfil.addEventListener("submit", async (e) => {
  e.preventDefault();
  const datos = Object.fromEntries(new FormData(formPerfil));
  if (!datos.nombre.trim() || !datos.apPat.trim()) return mostrarAlerta($("[data-alerta-perfil]"), "Escribe tu nombre y tu apellido paterno.");
  try {
    yo = await api("/usuarios/yo", { metodo: "PATCH", cuerpo: datos });
    const s = sesion.leer();
    s.usuario = { ...s.usuario, nombre: yo.nombre, apPat: yo.apPat, apMat: yo.apMat };
    sesion.guardar(s, Boolean(localStorage.getItem("sigepa.sesion")));
    dialogo.close();
    location.reload();
  } catch (err) {
    mostrarAlerta($("[data-alerta-perfil]"), err.message);
  }
});

/* ---------- Carga inicial ---------- */
let estadosPorId = {};
(async () => {
  cajaMis.innerHTML = cargando();
  cajaFav.innerHTML = cargando();
  try {
    const ids = favoritos.ids();
    const [perfil, mias, estados, fav] = await Promise.all([
      api("/auth/yo"), api("/usuarios/yo/recetas"), api("/estados"),
      api(`/recetas?ids=${ids.join(",")}&limit=60`),
    ]);
    yo = perfil; misRecetas = mias; recetasFav = fav.items;
    estadosPorId = Object.fromEntries(estados.map((e) => [e.idEstado, e.nomEstado]));
    pintarPerfil();
    pintarAportes();
    const enFav = [...new Map(recetasFav.map((r) => [r.estado.idEstado, r.estado.nomEstado])).entries()];
    pildoraMenu($("[data-filtro-estado]"), { etiqueta: "Todos los estados", opciones: [{ valor: "", texto: "Todos los estados" }, ...enFav.map(([v, t]) => ({ valor: String(v), texto: t }))], alCambiar: (v) => { filtrosFav.estado = v; pintarFavoritos(); } });
    pildoraMenu($("[data-filtro-tipo]"), { etiqueta: "Tipo de platillo", opciones: [{ valor: "", texto: "Todos los tipos" }, ...TIPOS_PLATILLO.map((t) => ({ valor: t, texto: t }))], alCambiar: (v) => { filtrosFav.tipo = v; pintarFavoritos(); } });
    pildoraMenu($("[data-orden-fav]"), { etiqueta: "Guardadas recientemente", estilo: "texto", alinear: "derecha", opciones: [{ valor: "", texto: "Guardadas recientemente" }, { valor: "antiguas", texto: "Guardadas primero" }, { valor: "nombre", texto: "Nombre (A–Z)" }], alCambiar: (v) => { filtrosFav.orden = v; pintarFavoritos(); } });
    pintarFavoritos();
  } catch (err) {
    cajaMis.innerHTML = estadoVacio(err.message);
    cajaFav.innerHTML = estadoVacio(err.message);
  }
})();
