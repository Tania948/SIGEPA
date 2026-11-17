// Utilidades de formularios.
import { icon } from "./icons.js";

/** Botones con data-ver-contrasenia="idDelInput" alternan entre mostrar y ocultar. */
export function activarVerContrasenia(root = document) {
  root.querySelectorAll("[data-ver-contrasenia]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.verContrasenia);
      const mostrar = input.type === "password";
      input.type = mostrar ? "text" : "password";
      btn.innerHTML = icon(mostrar ? "eye-off" : "eye", 18);
      btn.setAttribute("aria-label", mostrar ? "Ocultar contraseña" : "Mostrar contraseña");
    });
  });
}

/** Solo permite volver a rutas internas del sitio (evita redirecciones abiertas). */
export function destinoSeguro(ruta) {
  return ruta && ruta.startsWith("/") && !ruta.startsWith("//") ? ruta : "index.html";
}

/** Requisitos de contraseña usados en registro y restablecer. */
export function revisarContrasenia(valor) {
  return { largo: valor.length >= 8, mezcla: /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(valor) && /\d/.test(valor) };
}

/** Marca en verde los requisitos (data-req="largo|mezcla") mientras se escribe. */
export function activarRequisitos(input, contenedor) {
  const pintar = () => {
    const r = revisarContrasenia(input.value);
    contenedor.querySelector('[data-req="largo"]')?.classList.toggle("requisito--ok", r.largo);
    contenedor.querySelector('[data-req="mezcla"]')?.classList.toggle("requisito--ok", r.mezcla);
  };
  input.addEventListener("input", pintar);
  pintar();
}
