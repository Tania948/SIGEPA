// Página registro.html
import { api, sesion, parametro } from "../nucleo/api.js";
import { montarLayout } from "../componentes/layout.js";
import { mostrarAlerta } from "../componentes/componentes.js";
import { activarRequisitos, activarVerContrasenia, destinoSeguro, revisarContrasenia } from "../componentes/formularios.js";

montarLayout();
activarVerContrasenia();
const volver = destinoSeguro(parametro("volver"));
if (sesion.activa) location.replace(volver);
document.querySelector("[data-login]").href = `login.html${location.search}`;
const form = document.querySelector("[data-form]");
const alerta = document.querySelector("[data-alerta]");
activarRequisitos(form.contrasenia, document.querySelector("[data-requisitos]"));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(form));
  const req = revisarContrasenia(d.contrasenia);
  if (d.nombreCompleto.trim().split(/\s+/).length < 2) return mostrarAlerta(alerta, "Escribe tu nombre y al menos un apellido.");
  if (!form.email.checkValidity()) return mostrarAlerta(alerta, "Escribe un correo electrónico válido.");
  if (!req.largo || !req.mezcla) return mostrarAlerta(alerta, "Tu contraseña necesita 8 caracteres o más, con al menos una letra y un número.");
  if (d.contrasenia !== d.confirmar) return mostrarAlerta(alerta, "Las contraseñas no coinciden.");
  if (!form.terminos.checked) return mostrarAlerta(alerta, "Para crear tu cuenta, acepta los Términos de uso y el Aviso de privacidad.");
  const btn = form.querySelector("[type=submit]");
  btn.disabled = true;
  try {
    const r = await api("/auth/registro", { metodo: "POST", cuerpo: { nombreCompleto: d.nombreCompleto.trim(), email: d.email.trim(), contrasenia: d.contrasenia, rol: d.rol } });
    sesion.guardar(r, true);
    location.href = volver !== "index.html" ? volver : d.rol === "portador" ? "publicar.html" : "mi-perfil.html";
  } catch (err) {
    mostrarAlerta(alerta, err.message);
    btn.disabled = false;
  }
});
