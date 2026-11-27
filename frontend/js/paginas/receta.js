// Pantalla: Receta (detalle)
import { api, esc, parametro, sesion } from "../nucleo/api.js";
import { activarFavoritos, avatar, estadoVacio, fotoVacia, mostrarAlerta, tarjetaReceta } from "../componentes/componentes.js";
import { icon } from "../nucleo/icons.js";
import { montarLayout, ruta } from "../componentes/layout.js";
import { favoritos } from "../nucleo/local.js";
import { crearAtlas } from "../componentes/mapa-mexico.js";
import { abrirModoCocina } from "../componentes/modo-cocina.js";
import { creditoFoto, tamanoFoto } from "../nucleo/fotos.js";

montarLayout("recetas");
const main = document.querySelector("[data-receta]");

/* ---------- Cantidades: "½", "1 1/2", "0.5", "Al gusto" ---------- */
const FRACCIONES = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125 };
function aNumero(texto) {
  const t = String(texto ?? "").trim().replace(",", ".");
  if (!t) return null;
  let total = 0;
  let encontrado = false;
  for (const parte of t.split(/\s+/)) {
    if (FRACCIONES[parte] != null) { total += FRACCIONES[parte]; encontrado = true; }
    else if (/^\d+\/\d+$/.test(parte)) { const [a, b] = parte.split("/").map(Number); total += a / b; encontrado = true; }
    else if (/^\d+(\.\d+)?[½¼¾⅓⅔⅛]?$/.test(parte)) {
      const m = parte.match(/^(\d+(?:\.\d+)?)([½¼¾⅓⅔⅛])?$/);
      total += Number(m[1]) + (m[2] ? FRACCIONES[m[2]] : 0); encontrado = true;
    } else return null;
  }
  return encontrado ? total : null;
}
function aTexto(n) {
  const entero = Math.floor(n + 1e-9);
  const resto = n - entero;
  const simbolo = [[0, ""], [0.125, "⅛"], [0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"], [1, ""]]
    .reduce((mejor, act) => (Math.abs(act[0] - resto) < Math.abs(mejor[0] - resto) ? act : mejor));
  if (Math.abs(simbolo[0] - resto) < 0.04) {
    if (simbolo[0] === 1) return String(entero + 1);
    return entero ? `${entero}${simbolo[1] ? ` ${simbolo[1]}` : ""}` : simbolo[1] || "0";
  }
  return String(Math.round(n * 10) / 10);
}
function escalar(cantidad, factor) {
  const n = aNumero(cantidad);
  return n == null || factor === 1 ? cantidad : aTexto(n * factor);
}

/* ---------- Render ---------- */
/** Ingredientes como texto ("700 g pollo en piezas"), ya escalados a las porciones elegidas. */
function textosIngredientes(r, porciones) {
  const factor = r.porciones ? porciones / r.porciones : 1;
  return r.ingredientes.map((i) => [escalar(i.cantidad, factor), i.unidad && i.unidad !== "—" ? i.unidad : "", i.nombre].filter(Boolean).join(" "));
}

const pesos = (n) => `$${Math.round(n).toLocaleString("es-MX")}`;

function htmlIngredientes(r, porciones) {
  const factor = r.porciones ? porciones / r.porciones : 1;
  return r.ingredientes.map((i, n) => `
    <li><label>
      <input type="checkbox" aria-label="Tengo ${esc(i.nombre)}">
      <div><b>${esc([escalar(i.cantidad, factor), i.unidad && i.unidad !== "—" ? i.unidad : ""].filter(Boolean).join(" ")) || "&nbsp;"}</b>
      <span>${esc(i.nombre)}</span></div>
    </label></li>`).join("") || `<li class="texto-sm">Sin ingredientes registrados.</li>`;
}

function fecha(f) {
  return new Date(f).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

async function pintarComentarios(id) {
  const caja = document.querySelector("[data-comentarios]");
  const lista = await api(`/recetas/${id}/comentarios`).catch(() => []);
  const form = sesion.activa
    ? `<form class="comentario-form" data-comentar>
         <label class="sr-only" for="comentario">Tu comentario</label>
         <div class="entrada"><textarea id="comentario" name="comentario" rows="3" maxlength="1500" placeholder="¿La preparaste? Cuéntale a la comunidad cómo te fue." required></textarea></div>
         <div class="alerta" hidden data-alerta-comentario></div>
         <button class="btn btn--secundario" type="submit">Publicar comentario</button>
       </form>`
    : `<p class="texto-sm"><a class="enlace" href="login.html?volver=${encodeURIComponent(location.pathname + location.search)}">Inicia sesión</a> para dejar un comentario.</p>`;
  caja.innerHTML = `
    <h2>Comentarios de la comunidad <span class="texto-sm">(${lista.length})</span></h2>
    ${lista.map((c) => `
      <article class="comentario">
        ${avatar(c.autor.nombre, 36)}
        <div><strong>${esc(c.autor.nombre)}</strong><time datetime="${c.fechaComentario}">${fecha(c.fechaComentario)}</time>
        <p>${esc(c.comentario)}</p></div>
      </article>`).join("") || `<p class="texto-sm">Aún no hay comentarios. ¡Sé la primera persona en compartir cómo te quedó!</p>`}
    ${form}`;
  caja.querySelector("[data-comentar]")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    btn.disabled = true;
    try {
      await api(`/recetas/${id}/comentarios`, { metodo: "POST", cuerpo: { comentario: e.target.comentario.value } });
      pintarComentarios(id);
    } catch (err) {
      mostrarAlerta(caja.querySelector("[data-alerta-comentario]"), err.message);
      btn.disabled = false;
    }
  });
}

async function iniciar() {
  const id = Number(parametro("id"));
  let r;
  try {
    r = await api(`/recetas/${id}`);
  } catch (err) {
    main.innerHTML = estadoVacio(err.message, `<a class="btn btn--primario" href="recetas.html">Ver recetas</a>`);
    return;
  }
  document.title = `${r.nombreReceta} · SIGEPA MX`;
  const estado = r.estado.nomEstado;
  const lugar = [r.localidad, estado].filter(Boolean).join(", ");
  let porciones = r.porciones || 1;
  const nombreAutor = r.autor.nombre;
  const primerNombre = nombreAutor.split(" ")[0];
  const credito = creditoFoto(r.urlImagen);
  const aviso = r.estadoValidacion !== "validada"
    ? `<div class="alerta alerta--ok">${r.estadoValidacion === "rechazada"
        ? "Esta receta necesita cambios antes de publicarse. Solo tú la puedes ver."
        : "Esta receta está en revisión. Solo tú y el equipo de SIGEPA la pueden ver por ahora."}</div>` : "";

  main.innerHTML = `
    ${ruta([["Inicio", "index.html"], [estado, `estado.html?id=${r.estado.idEstado}`], [r.nombreReceta]])}
    ${aviso}
    <section class="receta-portada">
      <figure class="receta-portada__foto" style="margin:0">
        ${r.urlImagen ? `<img src="${esc(tamanoFoto(r.urlImagen, 960))}" alt="${esc(r.nombreReceta)}">` : `<div class="sin-foto">${fotoVacia(r, 64)}</div>`}
        ${credito ? `<a class="credito-foto" href="${credito.enlace}" target="_blank" rel="noopener">${credito.texto} · ver autor y licencia</a>` : ""}
        ${r.pieFoto ? `<figcaption>${esc(r.pieFoto)}</figcaption>` : ""}
      </figure>
      <div class="receta-ficha">
        <p class="eyebrow">${esc(estado.toUpperCase())}${r.region ? ` / ${esc(r.region.toUpperCase())}` : ""}</p>
        <h1>${esc(r.nombreReceta)}</h1>
        ${r.nombreLengua ? `<p class="receta-lengua">${icon("languages", 16)} En ${esc(r.lengua || "lengua originaria")}: <span lang="und">${esc(r.nombreLengua)}</span></p>` : ""}
        ${lugar ? `<p class="receta-ficha__lugar">${icon("map-pin", 17)}${esc(lugar)}</p>` : ""}
        ${r.descripcion ? `<p class="texto">${esc(r.descripcion)}</p>` : ""}
        <div class="receta-autor">
          ${avatar(nombreAutor, 46)}
          <div><strong>${esc(nombreAutor)}</strong><span class="texto-xs" style="color:var(--c-terracota)">Portador(a) de saberes</span> · <a href="perfil.html?id=${r.autor.idUs}">Ver perfil y sus recetas →</a></div>
        </div>
        <dl class="receta-datos" style="margin:0">
          <div><dt>Raciones</dt><dd>${r.porciones ? `${r.porciones} ${r.porciones === 1 ? "persona" : "personas"}` : "—"}</dd></div>
          <div><dt>Tiempo total</dt><dd>${r.tiempoTotal ? `${r.tiempoTotal} minutos` : "—"}</dd></div>
          <div style="text-align:right"><dt>Dificultad</dt><dd>${esc(r.dificultad ?? "—")}</dd></div>
        </dl>
        <div class="receta-acciones">
          <button class="btn btn--primario" type="button" data-cocinar>${icon("chef-hat", 18)}Modo cocina</button>
          <button class="btn btn--secundario" type="button" data-guardar></button>
          <button class="btn btn--secundario btn--icono-solo" type="button" data-imprimir aria-label="Imprimir receta" title="Imprimir receta">${icon("printer", 18)}</button>
        </div>
      </div>
    </section>

    <section class="receta-cuerpo">
      <aside class="receta-lateral">
        <div class="panel ingredientes">
          <h2>Ingredientes</h2>
          ${r.porciones ? `<div class="porciones" aria-live="polite">Para <span data-porciones>${porciones}</span> ${r.porciones === 1 ? "persona" : "personas"}
            <button type="button" data-menos aria-label="Menos porciones">−</button>/<button type="button" data-mas aria-label="Más porciones">+</button></div>` : ""}
          <ul class="lista-ingredientes" data-ingredientes>${htmlIngredientes(r, porciones)}</ul>
          <p class="costo-estimado" data-costo hidden></p>
        </div>
        ${r.latitud != null ? `<div class="panel donde">
            <h3>¿Dónde se cocina?</h3>
            <div class="mapa-chico" data-mapa-receta></div>
            <p class="texto-sm">${esc([r.localidad, r.municipio && r.municipio !== r.localidad ? `municipio de ${r.municipio}` : null, estado].filter(Boolean).join(", "))}</p>
            <p class="texto-xs">Ubicación aproximada de la localidad de origen.</p>
          </div>` : ""}
        ${r.consejo ? `<div class="consejo">${icon("cooking-pot", 24)}<h3>Un consejo de ${esc(primerNombre)}</h3><p>${esc(r.consejo)}</p></div>` : ""}
      </aside>

      <div>
        <div class="pasos-encabezado"><h2>Manos a la cocina</h2>${r.tiempoTotal ? `<span class="texto-xs">${r.tiempoTotal} min en total</span>` : ""}</div>
        <ol class="pasos">
          ${r.pasos.map((p, i) => `<li><span class="paso-num">${i + 1}</span><div>${p.titulo ? `<h3>${esc(p.titulo)}</h3>` : ""}<p>${esc(p.texto)}</p></div></li>`).join("")}
        </ol>
        ${r.historia ? `
          <section class="historia">
            <p class="eyebrow">LA HISTORIA DETRÁS DEL PLATILLO</p>
            <h2>Una cocina para reunirnos</h2>
            <blockquote>«${esc(r.historia)}»</blockquote>
            <p class="historia__autoria">Relato compartido por ${esc(nombreAutor)} · Versión familiar</p>
            <p class="historia__nota">Las recetas cambian de una familia a otra. Esta preparación representa la experiencia de su autora o autor, no una única forma de cocinar el platillo.</p>
          </section>` : ""}
        <section class="licencia-receta">
          ${icon("heart-handshake", 22)}
          <div><h3>Cómo se puede usar esta receta</h3><p>${esc(r.licenciaTexto)}</p>
          <p class="texto-xs">Compartida por ${esc(nombreAutor)} con el acuerdo de su comunidad. Si la cocinas o la citas, menciona su origen.</p></div>
        </section>
        <section class="comentarios" data-comentarios></section>
      </div>
    </section>

    <section class="territorio relacionadas" style="gap:22px">
      <div class="seccion-encabezado">
        <h2 class="titulo-md">Otros sabores para descubrir</h2>
        <a class="enlace" href="recetas.html">Explorar recetas →</a>
      </div>
      <div class="rejilla-recetas" data-otras></div>
    </section>`;

  // Favorito
  const guardar = main.querySelector("[data-guardar]");
  const pintarGuardar = () => {
    const activa = favoritos.tiene(id);
    guardar.innerHTML = `${icon(activa ? "bookmark-check" : "bookmark", 18)}${activa ? "Guardada en favoritos" : "Guardar en favoritos"}`;
    guardar.setAttribute("aria-pressed", String(activa));
  };
  pintarGuardar();
  guardar.addEventListener("click", () => {
    if (!sesion.activa) { location.href = `login.html?volver=${encodeURIComponent(location.pathname + location.search)}`; return; }
    favoritos.alternar(id);
    pintarGuardar();
  });
  main.querySelector("[data-imprimir]").addEventListener("click", () => window.print());

  // Porciones
  // Costo estimado con precios de referencia (se recalcula al cambiar las porciones)
  const cajaCosto = main.querySelector("[data-costo]");
  let esperaCosto;
  const pintarCosto = () => {
    clearTimeout(esperaCosto);
    esperaCosto = setTimeout(async () => {
      try {
        const c = await api(`/recetas/${id}/costo?personas=${porciones}`);
        cajaCosto.innerHTML = `${icon("wallet", 16)} Costo estimado: <strong>${pesos(c.total)}</strong> (${pesos(c.porPorcion)} por persona)
          <span class="texto-xs">Precios de referencia aproximados; varían según la región y la temporada.</span>`;
        cajaCosto.hidden = false;
      } catch { cajaCosto.hidden = true; }
    }, 250);
  };
  pintarCosto();

  const cambiar = (d) => {
    porciones = Math.min(Math.max(1, porciones + d), 50);
    main.querySelector("[data-porciones]").textContent = porciones;
    main.querySelector("[data-ingredientes]").innerHTML = htmlIngredientes(r, porciones);
    main.querySelector("[data-menos]").disabled = porciones <= 1;
    pintarCosto();
  };

  // Modo cocina (paso a paso, voz y temporizadores)
  main.querySelector("[data-cocinar]").addEventListener("click", () => abrirModoCocina(r, { ingredientes: textosIngredientes(r, porciones) }));
  main.querySelector("[data-menos]")?.addEventListener("click", () => cambiar(-1));
  main.querySelector("[data-mas]")?.addEventListener("click", () => cambiar(1));

  pintarComentarios(id);

  // Mapa de la localidad de origen
  const cajaMapa = main.querySelector("[data-mapa-receta]");
  if (cajaMapa) {
    const atlas = crearAtlas(cajaMapa, { soloEstado: r.estado.idEstado });
    atlas.seleccionarEstado(r.estado.idEstado, { acercar: false }).then(() => {
      if (r.cveMun) atlas.seleccionarMunicipio(r.cveMun, { acercar: false });
      atlas.mapa.setView([r.latitud, r.longitud], 9);
      atlas.marcar(r.latitud, r.longitud, r.localidad);
    });
  }

  // Otras recetas: primero del mismo estado, luego de otros
  const otras = main.querySelector("[data-otras]");
  activarFavoritos(otras);
  const [mismo, todas] = await Promise.all([
    api(`/recetas?estado=${r.estado.idEstado}&limit=4`).catch(() => ({ items: [] })),
    api("/recetas?limit=8").catch(() => ({ items: [] })),
  ]);
  const vistas = new Set([id]);
  const seleccion = [...mismo.items.slice(0, 2), ...todas.items, ...mismo.items]
    .filter((x) => !vistas.has(x.idReceta) && vistas.add(x.idReceta)).slice(0, 3);
  otras.innerHTML = seleccion.map((x) => tarjetaReceta(x)).join("");
}
iniciar();
