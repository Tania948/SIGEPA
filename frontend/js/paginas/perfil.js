// Página perfil.html
import { api, esc, parametro } from "../nucleo/api.js";
import { activarFavoritos, avatar, estadoVacio, insigniaRol, pildoraMenu, tarjetaReceta } from "../componentes/componentes.js";
import { icon } from "../nucleo/icons.js";
import { montarLayout, ruta } from "../componentes/layout.js";

montarLayout("explorar");
const main = document.querySelector("[data-perfil]");
try {
  const p = await api(`/usuarios/${Number(parametro("id"))}`);
  const nombre = [p.nombre, p.apPat, p.apMat].filter(Boolean).join(" ");
  document.title = `${nombre} · SIGEPA MX`;
  const desde = p.estadoPrincipal ? `Desde ${p.estadoPrincipal}` : "Comunidad SIGEPA";
  main.innerHTML = `
    ${ruta([["Inicio", "index.html"], ["Recetas", "recetas.html"], [nombre]])}
    <section class="panel perfil-card perfil-card--publico">
      ${avatar(nombre, 152, "avatar--serif")}
      <div class="perfil-card__datos">
        <p class="eyebrow">VOCES DE NUESTRA COCINA</p>
        <div>${insigniaRol(p.tipoUsu)}</div>
        <h1>${esc(nombre)}</h1>
        ${p.estadoPrincipal ? `<p class="perfil-card__lugar">${icon("map-pin", 17)}${esc(p.estadoPrincipal)}</p>` : ""}
        <p class="texto">${p.tipoUsu === 2 ? "Explora y guarda las recetas de la comunidad." : p.totalRecetas
          ? `Comparte recetas ${p.estadoPrincipal ? `de ${esc(p.estadoPrincipal)} ` : ""}para que más personas puedan volver a prepararlas.`
          : "Todavía no tiene recetas publicadas."}</p>
        ${p.regiones.length ? `<div class="chips">${p.regiones.map((r) => `<a class="chip" href="recetas.html?region=${encodeURIComponent(r)}">Cocina de ${esc(r)}</a>`).join("")}</div>` : ""}
      </div>
      <div class="contador">
        <strong>${p.totalRecetas}</strong>
        <span>${p.totalRecetas === 1 ? "receta compartida" : "recetas compartidas"}</span>
        <small>${esc(desde)}</small>
      </div>
    </section>

    <section class="estado-listado">
      <h2 class="titulo-md">Las recetas de ${esc(p.nombre)}</h2>
      <div class="resultados__barra"><p>${p.totalRecetas} ${p.totalRecetas === 1 ? "aporte publicado" : "aportes publicados"}</p><div data-orden></div></div>
      <div class="rejilla-recetas" data-lista></div>
    </section>`;

  const lista = main.querySelector("[data-lista]");
  activarFavoritos(lista);
  const ordenar = (modo) => {
    const items = [...p.recetas];
    if (modo === "antiguas") items.reverse();
    if (modo === "nombre") items.sort((a, b) => a.nombreReceta.localeCompare(b.nombreReceta, "es"));
    if (modo === "tiempo") items.sort((a, b) => (a.tiempoTotal ?? 1e9) - (b.tiempoTotal ?? 1e9));
    lista.innerHTML = items.length ? items.map((r) => tarjetaReceta(r)).join("")
      : estadoVacio("Aún no hay recetas publicadas en este perfil.");
  };
  pildoraMenu(main.querySelector("[data-orden]"), {
    etiqueta: "Más recientes", estilo: "texto", alinear: "derecha",
    opciones: [{ valor: "", texto: "Más recientes" }, { valor: "antiguas", texto: "Más antiguas" }, { valor: "tiempo", texto: "Menor tiempo" }, { valor: "nombre", texto: "Nombre (A–Z)" }],
    alCambiar: ordenar,
  });
  ordenar("");
} catch (err) {
  main.innerHTML = estadoVacio(err.message, `<a class="btn btn--primario" href="recetas.html">Ver recetas</a>`);
}
