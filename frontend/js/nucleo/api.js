// Cliente de la API de SIGEPA y manejo de la sesión del usuario.
const CLAVE_SESION = "sigepa.sesion";

export const sesion = {
  leer() {
    try {
      return JSON.parse(localStorage.getItem(CLAVE_SESION) || sessionStorage.getItem(CLAVE_SESION) || "null");
    } catch {
      return null;
    }
  },
  guardar(datos, recordar = true) {
    try {
      (recordar ? localStorage : sessionStorage).setItem(CLAVE_SESION, JSON.stringify(datos));
    } catch { /* almacenamiento no disponible */ }
  },
  cerrar() {
    try { localStorage.removeItem(CLAVE_SESION); sessionStorage.removeItem(CLAVE_SESION); } catch { /* nada */ }
  },
  get usuario() { return this.leer()?.usuario ?? null; },
  get token() { return this.leer()?.token ?? null; },
  get activa() { return Boolean(this.token); },
};

export class ErrorApi extends Error {
  constructor(mensaje, estado) { super(mensaje); this.estado = estado; }
}

/** Llama a la API. Devuelve el JSON o lanza ErrorApi con un mensaje legible. */
export async function api(ruta, { metodo = "GET", cuerpo, archivo } = {}) {
  const headers = {};
  if (sesion.token) headers.Authorization = `Bearer ${sesion.token}`;
  let body;
  if (archivo) body = archivo;
  else if (cuerpo !== undefined) { headers["Content-Type"] = "application/json"; body = JSON.stringify(cuerpo); }

  let res;
  try {
    res = await fetch(`/api${ruta}`, { method: metodo, headers, body });
  } catch {
    throw new ErrorApi("No pudimos conectar con el servidor. Revisa tu conexión.", 0);
  }
  const datos = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && sesion.activa && ruta !== "/auth/login") sesion.cerrar();
    const msg = Array.isArray(datos?.message) ? datos.message.join(" ") : datos?.message;
    throw new ErrorApi(msg || "Algo salió mal. Intenta de nuevo.", res.status);
  }
  return datos;
}

/** Redirige al acceso si no hay sesión; vuelve a la página actual después. */
export function requerirSesion() {
  if (sesion.activa) return true;
  location.href = `login.html?volver=${encodeURIComponent(location.pathname + location.search)}`;
  return false;
}

export function parametro(nombre) {
  return new URLSearchParams(location.search).get(nombre);
}

/** Escapa texto para insertarlo en HTML. */
export function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
