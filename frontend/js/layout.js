// Navegación global, menú lateral y pie de aplicación (comunes a todas las pantallas).
import { esc, sesion } from "./api.js";
import { hydrateIcons, icon } from "./icons.js";
import { avatar as avatarIniciales } from "./componentes.js";
import { IDIOMAS, aplicarIdioma, idiomaActual } from "./idioma.js";
import { montarAsistente } from "./asistente.js";

const opcionesIdioma = () => Object.entries(IDIOMAS).map(([clave, i]) =>
  `<button type="button" class="idioma__opcion" data-idioma="${clave}" lang="${clave}" aria-pressed="${clave === idiomaActual()}">${i.nombre}</button>`).join("");

const DESTINOS = [
  { id: "explorar", texto: "Explorar México", href: "index.html" },
  { id: "recetas", texto: "Recetas", href: "recetas.html" },
  { id: "sobre", texto: "Sobre el proyecto", href: "sobre.html" },
];

const nombreCompleto = (u) => [u?.nombre, u?.apPat].filter(Boolean).join(" ");

export function avatar(u, tam = 36) { return avatarIniciales(nombreCompleto(u), tam); }

/** Ruta de navegación: [["Inicio", "index.html"], ..., ["Página actual"]] */
export function ruta(pasos) {
  return `<nav class="ruta" aria-label="Ruta de navegación">${pasos.map(([t, href], i) =>
    href && i < pasos.length - 1 ? `<a href="${href}">${esc(t)}</a>` : `<span aria-current="page">${esc(t)}</span>`).join('<span class="ruta__sep">/</span>')}</nav>`;
}

function htmlNav(activa) {
  const u = sesion.usuario;
  const destinos = DESTINOS.map((d) =>
    `<a class="nav__destino${d.id === activa ? " nav__destino--activo" : ""}" href="${d.href}"${d.id === activa ? ' aria-current="page"' : ""}>${d.texto}</a>`
  ).join("");
  const cuenta = u
    ? `<div class="nav__cuenta">
         <button class="nav__cuenta-btn" type="button" aria-haspopup="true" aria-expanded="false" data-cuenta>
           ${avatar(u)}<span>${esc(nombreCompleto(u))}</span>${icon("chevron-down", 16)}
         </button>
         <div class="nav__cuenta-menu" hidden data-cuenta-menu>
           <a href="mi-perfil.html">${icon("user-round", 18)} Mi perfil / Mis recetas</a>
           <a href="publicar.html">${icon("circle-plus", 18)} Publicar receta</a>
           <a href="mi-perfil.html?pestana=favoritos">${icon("bookmark", 18)} Mis favoritos</a>
           <button type="button" data-salir>${icon("log-out", 18)} Cerrar sesión</button>
         </div>
       </div>`
    : `<a class="nav__acceso" href="login.html">Iniciar sesión</a>`;
  return `
    <header class="nav">
      <button class="nav__menu" type="button" aria-label="Abrir menú" data-abrir-menu>${icon("menu", 23)}</button>
      <a class="nav__logo" href="index.html" aria-label="SIGEPA MX, inicio">
        <img src="assets/img/logo-sigepa.png" alt="SIGEPA MX · Patrimonio gastronómico mexicano" width="200" height="90">
      </a>
      <nav class="nav__destinos" aria-label="Principal">${destinos}</nav>
      <div class="idioma" data-sin-traducir>
        <button class="idioma__btn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Idioma / T'aan / Tlahtolli" data-idioma-btn>
          ${icon("languages", 18)}<span data-idioma-actual>${IDIOMAS[idiomaActual()].corto}</span>${icon("chevron-down", 14)}
        </button>
        <div class="idioma__menu" hidden data-idioma-menu>${opcionesIdioma()}</div>
      </div>
      <a class="nav__publicar" href="publicar.html">＋ Publicar receta</a>
      ${cuenta}
    </header>`;
}

function htmlMenu(activa) {
  const u = sesion.usuario;
  const d = (href, ico, texto, id) =>
    `<a class="menu-lateral__destino${id === activa ? " menu-lateral__destino--activo" : ""}" href="${href}">${icon(ico, 20)}<span>${texto}</span></a>`;
  const acceso = u
    ? `<div class="menu-lateral__acceso">
         <h3>Hola, ${esc(u.nombre)}.</h3>
         <p class="texto-sm">Gracias por cuidar los sabores de tu comunidad.</p>
         <button class="btn btn--secundario" type="button" data-salir>Cerrar sesión</button>
       </div>`
    : `<div class="menu-lateral__acceso">
         <h3>Una cocina que se comparte.</h3>
         <p class="texto-sm">Inicia sesión para guardar tus favoritas y aportar tus propias recetas.</p>
         <a class="btn btn--primario" href="login.html">Iniciar sesión</a>
         <a class="enlace" href="registro.html">¿Aún no tienes cuenta? Regístrate →</a>
       </div>`;
  return `
    <div class="cortina" hidden data-cortina></div>
    <aside class="menu-lateral" hidden data-menu aria-label="Explora y participa" role="dialog" aria-modal="true">
      <div class="menu-lateral__encabezado">
        <h2>Explora y participa</h2>
        <button class="menu-lateral__cerrar" type="button" aria-label="Cerrar menú" data-cerrar-menu>${icon("x", 20)}</button>
      </div>
      <div class="menu-lateral__grupo menu-lateral__grupo--descubrir">
        <p class="eyebrow eyebrow--gris">DESCUBRIR</p>
        ${d("index.html", "map", "Explorar México", "explorar")}
        ${d("index.html#territorio", "map-pinned", "Todos los estados", "estados")}
        ${d("busqueda.html", "sliders-horizontal", "Búsqueda avanzada", "busqueda")}
      </div>
      <hr class="separador">
      <div class="menu-lateral__grupo">
        <p class="eyebrow eyebrow--gris">MI COMUNIDAD</p>
        ${d("publicar.html", "circle-plus", "Publicar receta", "publicar")}
        ${d("mi-perfil.html", "user-round", "Mi perfil / Mis recetas", "perfil")}
        ${d("mi-perfil.html?pestana=favoritos", "bookmark", "Mis favoritos", "favoritos")}
        ${d("sobre.html", "info", "Quiénes somos", "sobre")}
      </div>
      <hr class="separador">
      <div class="menu-lateral__grupo">
        <p class="eyebrow eyebrow--gris">IDIOMA</p>
        <div class="idioma__lista" data-sin-traducir>${opcionesIdioma()}</div>
      </div>
      ${acceso}
    </aside>`;
}

const PIE = `
  <footer class="pie">
    <div>
      <p class="pie__marca">SIGEPA MX</p>
      <p class="pie__lema">Saberes que se comparten. Raíces que permanecen.</p>
    </div>
    <nav class="pie__enlaces" aria-label="Información">
      <a href="sobre.html">Sobre el proyecto</a>
      <a href="sobre.html#terminos">Términos de uso</a>
      <a href="sobre.html#privacidad">Privacidad</a>
    </nav>
  </footer>`;

/** Inserta la navegación y el pie. `activa` = id del destino resaltado. */
export function montarLayout(activa) {
  document.body.insertAdjacentHTML("afterbegin", htmlNav(activa) + htmlMenu(activa));
  document.body.insertAdjacentHTML("beforeend", PIE);
  hydrateIcons();

  const menu = document.querySelector("[data-menu]");
  const cortina = document.querySelector("[data-cortina]");
  const abrir = () => { menu.hidden = false; cortina.hidden = false; document.body.classList.add("sin-scroll"); menu.querySelector("a,button")?.focus(); };
  const cerrar = () => { menu.hidden = true; cortina.hidden = true; document.body.classList.remove("sin-scroll"); };
  document.querySelector("[data-abrir-menu]").addEventListener("click", abrir);
  document.querySelector("[data-cerrar-menu]").addEventListener("click", cerrar);
  cortina.addEventListener("click", cerrar);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrar(); });

  const btnCuenta = document.querySelector("[data-cuenta]");
  const menuCuenta = document.querySelector("[data-cuenta-menu]");
  if (btnCuenta) {
    btnCuenta.addEventListener("click", (e) => {
      e.stopPropagation();
      menuCuenta.hidden = !menuCuenta.hidden;
      btnCuenta.setAttribute("aria-expanded", String(!menuCuenta.hidden));
    });
    document.addEventListener("click", () => { menuCuenta.hidden = true; btnCuenta.setAttribute("aria-expanded", "false"); });
  }
  const btnIdioma = document.querySelector("[data-idioma-btn]");
  const menuIdioma = document.querySelector("[data-idioma-menu]");
  btnIdioma.addEventListener("click", (e) => {
    e.stopPropagation();
    menuIdioma.hidden = !menuIdioma.hidden;
    btnIdioma.setAttribute("aria-expanded", String(!menuIdioma.hidden));
  });
  document.addEventListener("click", () => { menuIdioma.hidden = true; btnIdioma.setAttribute("aria-expanded", "false"); });
  document.querySelectorAll("[data-idioma]").forEach((b) => b.addEventListener("click", () => {
    aplicarIdioma(b.dataset.idioma);
    menuIdioma.hidden = true;
  }));
  montarAsistente();
  aplicarIdioma();

  document.querySelectorAll("[data-salir]").forEach((b) => b.addEventListener("click", () => {
    sesion.cerrar();
    location.href = "index.html";
  }));
}
