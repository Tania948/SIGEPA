// Página: Créditos (fotos fijas del sitio y fotos de recetas tomadas de Wikimedia Commons)
import { api, esc } from "../nucleo/api.js";
import { montarLayout, ruta } from "../componentes/layout.js";
import { FOTOS, creditoFoto, paginaCommons, tamanoFoto } from "../nucleo/fotos.js";

montarLayout("sobre");
document.querySelector("[data-ruta]").outerHTML = ruta([["Inicio", "index.html"], ["Créditos"]]);

const item = (url, titulo, archivo, enlace) => `
  <li>
    <img src="${esc(tamanoFoto(url, 250))}" alt="" loading="lazy">
    <div><strong>${esc(titulo)}</strong><span class="texto-xs">${esc(archivo)}</span>
    <a class="enlace" href="${enlace}" target="_blank" rel="noopener">Autor y licencia en Wikimedia Commons →</a></div>
  </li>`;

(async () => {
  const fijas = Object.values(FOTOS).map((f) => item(f.url, f.alt, f.archivo, paginaCommons(f.archivo)));
  const recetas = await api("/recetas?conFoto=1&limit=100").catch(() => ({ items: [] }));
  const deRecetas = recetas.items.map((r) => ({ r, c: creditoFoto(r.urlImagen) })).filter((x) => x.c)
    .map(({ r, c }) => item(r.urlImagen, `Receta: ${r.nombreReceta}`, c.archivo, c.enlace));
  document.querySelector("[data-fotos]").innerHTML = [...fijas, ...deRecetas].join("");
})();
