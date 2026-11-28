// Página login.html
import { api, sesion, parametro } from "../nucleo/api.js";
import { montarLayout } from "../componentes/layout.js";
import { mostrarAlerta } from "../componentes/componentes.js";
import { activarVerContrasenia, destinoSeguro } from "../componentes/formularios.js";

montarLayout();
activarVerContrasenia();
const volver = destinoSeguro(parametro("volver"));
if (sesion.activa) location.replace(volver);
document.querySelector("[data-registro]").href = `registro.html${location.search}`;

const form = document.querySelector("[data-form]");
const alerta = document.querySelector("[data-alerta]");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const datos = new FormData(form);
  if (!datos.get("email") || !datos.get("contrasenia")) return mostrarAlerta(alerta, "Escribe tu correo y tu contraseña.");
  const btn = form.querySelector("[type=submit]");
  btn.disabled = true;
  try {
    const recordar = datos.get("recordar") === "on";
    const r = await api("/auth/login", { metodo: "POST", cuerpo: { email: datos.get("email"), contrasenia: datos.get("contrasenia"), recordar } });
    sesion.guardar(r, recordar);
    location.href = volver;
  } catch (err) {
    mostrarAlerta(alerta, err.message);
    btn.disabled = false;
  }
});
