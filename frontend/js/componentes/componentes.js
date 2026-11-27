// Componentes reutilizables: tarjeta de receta, favoritos, menús desplegables, paginación y mensajes.
import { tamanoFoto } from "../nucleo/fotos.js";
import { esc, sesion } from "../nucleo/api.js";
import { icon } from "../nucleo/icons.js";
import { favoritos } from "../nucleo/local.js";

export function textoTiempo(r) {
  const partes = [];
  if (r.tiempoTotal) partes.push(`◷ ${r.tiempoTotal} min`);
  if (r.dificultad) partes.push(r.dificultad);
  return partes.join("   ·   ");
}

export function textoLugar(r) {
  const estado = esc((r.estado?.nomEstado || "").toUpperCase());
  return r.region ? `${estado}  / ${esc(r.region)}` : estado;
}

export function iniciales(nombre = "") {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";
}

export function avatar(nombre, tam = 36, clase = "") {
  return `<span class="avatar ${clase}" style="--tam:${tam}px" aria-hidden="true">${esc(iniciales(nombre))}</span>`;
}

const ETIQUETAS = {
  borrador: ["Borrador", "etiqueta--borrador"],
  pendiente: ["En revisión", "etiqueta--revision"],
  rechazada: ["Requiere cambios", "etiqueta--rechazada"],
};

/**
 * Tarjeta de receta.
 * modo: "publica" (marcador para guardar), "favorito" (marcador + "Quitar de favoritos"),
 *       "propia" (menú de opciones, etiqueta de estado y "Editar receta").
 */
export function tarjetaReceta(r, { modo = "publica", enlaceEditar } = {}) {
  const url = r.idReceta ? `receta.html?id=${r.idReceta}` : enlaceEditar;
  const editar = enlaceEditar ?? `publicar.html?id=${r.idReceta}`;
  const foto = r.urlImagen ? `<img src="${esc(tamanoFoto(r.urlImagen, 500))}" alt="" loading="lazy">` : fotoVacia(r);

  let accion;
  if (modo === "propia") {
    accion = `<div class="tarjeta__opciones">
        <button class="tarjeta__accion" type="button" data-opciones aria-haspopup="true" aria-label="Opciones de ${esc(r.nombreReceta)}">${icon("ellipsis", 18)}</button>
        <div class="menu-flotante" hidden>
          <a href="${editar}">${icon("pencil", 16)} Editar</a>
          ${r.idReceta && r.estadoValidacion === "validada" ? `<a href="${url}">${icon("arrow-up-right", 16)} Ver publicada</a>` : ""}
          <button type="button" data-eliminar="${r.idReceta ?? r.idBorrador}">${icon("trash-2", 16)} Eliminar</button>
        </div>
      </div>`;
  } else {
    const activa = favoritos.tiene(r.idReceta);
    accion = `<button class="tarjeta__accion${activa ? " tarjeta__accion--activa" : ""}" type="button" data-favorito="${r.idReceta}"
      aria-pressed="${activa}" aria-label="${activa ? "Quitar de favoritos" : "Guardar en favoritos"}">${icon(activa ? "bookmark-check" : "bookmark", 18)}</button>`;
  }
  const [textoEtiqueta, claseEtiqueta] = modo === "propia" ? ETIQUETAS[r.estadoValidacion] ?? [] : [];
  const etiqueta = textoEtiqueta ? `<span class="tarjeta__etiqueta ${claseEtiqueta}">${textoEtiqueta}</span>` : "";
  const autor = r.autor?.nombre
    ? `<p class="tarjeta__autor">Por <a href="perfil.html?id=${r.autor.idUs}">${esc(r.autor.nombre)}</a></p>` : "";
  const quitar = modo === "favorito"
    ? `<button class="tarjeta__quitar" type="button" data-quitar-favorito="${r.idReceta}">Quitar de favoritos</button>` : "";
  const destino = modo === "propia" ? `<a href="${editar}">Editar receta →</a>` : `<a href="${url}">Ver receta →</a>`;

  return `
    <article class="tarjeta" data-receta="${r.idReceta ?? r.idBorrador}">
      <div class="tarjeta__foto"><a href="${modo === "propia" ? editar : url}" tabindex="-1" aria-hidden="true">${foto}</a>${accion}${etiqueta}</div>
      <div class="tarjeta__info">
        <p class="tarjeta__lugar">${textoLugar(r) || "&nbsp;"}</p>
        <h3 class="tarjeta__nombre"><a href="${modo === "propia" ? editar : url}">${esc(r.nombreReceta || "Receta sin nombre")}</a></h3>
        ${autor}
        <hr class="separador">
        <div class="tarjeta__meta"><span class="tarjeta__meta-datos">${esc(textoTiempo(r))}</span>${destino}</div>
        ${quitar}
      </div>
    </article>`;
}

/** Ilustración para recetas sin fotografía, según el tipo de platillo. */
const ILUSTRACION = {
  "Sopa o caldo": ["soup", "#e7eee6"], "Tamal": ["leaf", "#e9efd9"], "Antojito": ["flame", "#f6e5de"],
  "Bebida": ["coffee", "#efe6da"], "Postre": ["cake-slice", "#f6ead4"], "Guarnición": ["salad", "#e7eee6"],
  "Salsa o mole": ["flame", "#f2e1dc"], "Plato fuerte": ["utensils-crossed", "#f0ede3"],
};
export function fotoVacia(r, tam = 40) {
  let [ico, fondo] = ILUSTRACION[r.tipoPlatillo] ?? ["cooking-pot", "#f0ede3"];
  if (/pescado|camar|jaiba|langosta|almeja|pejelagarto|aguachile|caz[oó]n|tikin/i.test(r.nombreReceta ?? "")) ico = "fish";
  return `<div class="tarjeta__foto-vacia" style="background-color:${fondo}">
    <span class="foto-vacia__icono">${icon(ico, tam)}</span>
    <span class="foto-vacia__texto">${esc(r.estado?.nomEstado ?? "")}</span></div>`;
}

function irAlAcceso() {
  location.href = `login.html?volver=${encodeURIComponent(location.pathname + location.search)}`;
}

/** Botones de marcador y "Quitar de favoritos" dentro de `contenedor`. */
export function activarFavoritos(contenedor, { alQuitar } = {}) {
  contenedor.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-favorito],[data-quitar-favorito]");
    if (!btn) return;
    e.preventDefault();
    if (!sesion.activa) return irAlAcceso();
    const id = btn.dataset.favorito || btn.dataset.quitarFavorito;
    const guardada = btn.hasAttribute("data-quitar-favorito") ? (favoritos.quitar(id), false) : favoritos.alternar(id);
    contenedor.querySelectorAll(`[data-favorito="${id}"]`).forEach((b) => {
      b.setAttribute("aria-pressed", String(guardada));
      b.classList.toggle("tarjeta__accion--activa", guardada);
      b.setAttribute("aria-label", guardada ? "Quitar de favoritos" : "Guardar en favoritos");
      b.innerHTML = icon(guardada ? "bookmark-check" : "bookmark", 18);
    });
    if (!guardada) alQuitar?.(id);
  });
}

/** Menú "…" de las tarjetas propias. */
export function activarOpciones(contenedor, { alEliminar } = {}) {
  contenedor.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-opciones]");
    if (btn) {
      e.stopPropagation();
      const menu = btn.nextElementSibling;
      contenedor.querySelectorAll(".menu-flotante").forEach((m) => { if (m !== menu) m.hidden = true; });
      menu.hidden = !menu.hidden;
      return;
    }
    const eliminar = e.target.closest("[data-eliminar]");
    if (eliminar) alEliminar?.(eliminar.dataset.eliminar);
  });
  document.addEventListener("click", () => contenedor.querySelectorAll(".menu-flotante").forEach((m) => { m.hidden = true; }));
}

/**
 * Píldora con menú desplegable (filtros "Tipo de platillo ▾", orden "Más recientes ▾", etc.).
 * opciones: [{ valor, texto }]. El primer elemento suele ser "todos" con valor "".
 */
export function pildoraMenu(contenedor, { etiqueta, opciones, valor = "", alCambiar, alinear = "izquierda", estilo = "pildora" }) {
  const raiz = document.createElement("div");
  raiz.className = "desplegable";
  const texto = () => (valor ? opciones.find((o) => o.valor === valor)?.texto : etiqueta) ?? etiqueta;
  raiz.innerHTML = `
    <button type="button" class="${estilo === "texto" ? "orden" : "pildora"}" aria-haspopup="listbox" aria-expanded="false"></button>
    <div class="menu-flotante menu-flotante--${alinear}" role="listbox" hidden></div>`;
  const btn = raiz.querySelector("button");
  const menu = raiz.querySelector(".menu-flotante");
  const pintar = () => {
    btn.innerHTML = `${esc(texto())} <span class="pildora__flecha">v</span>`;
    btn.classList.toggle("pildora--activa", Boolean(valor) && estilo !== "texto");
    menu.innerHTML = opciones.map((o) =>
      `<button type="button" role="option" aria-selected="${o.valor === valor}" data-valor="${esc(o.valor)}">${esc(o.texto)}</button>`).join("");
  };
  pintar();
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    document.querySelectorAll(".desplegable .menu-flotante").forEach((m) => { if (m !== menu) m.hidden = true; });
    menu.hidden = !menu.hidden;
    btn.setAttribute("aria-expanded", String(!menu.hidden));
  });
  menu.addEventListener("click", (e) => {
    const op = e.target.closest("[data-valor]");
    if (!op) return;
    valor = op.dataset.valor;
    menu.hidden = true;
    pintar();
    alCambiar?.(valor);
  });
  document.addEventListener("click", () => { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); });
  contenedor.appendChild(raiz);
  return { set(v) { valor = v; pintar(); } };
}

/** Paginación "← Anterior 1 2 3 Siguiente →". */
export function paginacion(pagina, paginas) {
  if (paginas <= 1) return "";
  const nums = [];
  for (let i = 1; i <= paginas; i++) {
    if (i === 1 || i === paginas || Math.abs(i - pagina) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }
  return `<nav class="paginacion" aria-label="Paginación">
    <button class="paginacion__paso" type="button" data-pagina="${pagina - 1}" ${pagina <= 1 ? "disabled" : ""}>← Anterior</button>
    ${nums.map((n) => n === "…" ? `<span class="paginacion__hueco">…</span>`
      : `<button class="paginacion__num${n === pagina ? " paginacion__num--activa" : ""}" type="button" data-pagina="${n}" ${n === pagina ? 'aria-current="page"' : ""}>${n}</button>`).join("")}
    <button class="paginacion__paso" type="button" data-pagina="${pagina + 1}" ${pagina >= paginas ? "disabled" : ""}>Siguiente →</button>
  </nav>`;
}

export function mostrarAlerta(el, mensaje, tipo = "error") {
  el.className = `alerta alerta--${tipo}`;
  el.textContent = mensaje;
  el.hidden = false;
}

export function estadoVacio(mensaje, accionHtml = "") {
  return `<div class="vacio">${icon("cooking-pot", 28)}<p>${esc(mensaje)}</p>${accionHtml}</div>`;
}

export function cargando() {
  return `<div class="vacio vacio--cargando"><p>Cargando…</p></div>`;
}

export const ROLES = { 1: "Equipo SIGEPA", 2: "Usuario", 3: "Portador(a) de saberes" };

/** Insignia del rol (tipoUsu): 1 administrador, 2 usuario, 3 portador de saberes. */
export function insigniaRol(tipoUsu) {
  if (!ROLES[tipoUsu]) return "";
  return `<span class="insignia${tipoUsu === 3 ? " insignia--portador" : ""}">${icon(tipoUsu === 3 ? "heart-handshake" : "user-round", 14)}${ROLES[tipoUsu]}</span>`;
}
