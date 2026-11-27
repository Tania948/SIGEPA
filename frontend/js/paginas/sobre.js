// Página sobre.html
import { sesion } from "../nucleo/api.js";
import { montarLayout, ruta } from "../componentes/layout.js";
montarLayout("sobre");
document.querySelector("[data-ruta]").outerHTML = ruta([["Inicio", "index.html"], ["Sobre el proyecto"]]);
if (sesion.activa) {
  document.querySelector("[data-invitacion] a").href = "publicar.html";
  document.querySelector("[data-invitacion] a").textContent = "Publicar una receta";
}
