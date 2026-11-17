// Favoritos y borradores: el diccionario de datos no tiene tablas para ellos,
// así que se guardan en el navegador de cada persona (localStorage), separados por usuario.
import { sesion } from "./api.js";

function leer(clave, porDefecto) {
  try { return JSON.parse(localStorage.getItem(clave)) ?? porDefecto; } catch { return porDefecto; }
}
function escribir(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
}
const clave = (tipo) => `sigepa.${tipo}.${sesion.usuario?.idUs ?? "anonimo"}`;

export const favoritos = {
  /** [{ id, fecha }] del más reciente al más antiguo */
  todos() { return leer(clave("favoritos"), []); },
  ids() { return this.todos().map((f) => f.id); },
  tiene(id) { return this.ids().includes(Number(id)); },
  agregar(id) {
    const lista = this.todos().filter((f) => f.id !== Number(id));
    lista.unshift({ id: Number(id), fecha: Date.now() });
    escribir(clave("favoritos"), lista);
  },
  quitar(id) { escribir(clave("favoritos"), this.todos().filter((f) => f.id !== Number(id))); },
  alternar(id) { if (this.tiene(id)) { this.quitar(id); return false; } this.agregar(id); return true; },
};

export const borradores = {
  /** [{ id, datos, actualizado }] */
  todos() { return leer(clave("borradores"), []); },
  obtener(id) { return this.todos().find((b) => b.id === id) ?? null; },
  guardar(datos, id = null) {
    const lista = this.todos();
    const nuevoId = id ?? `b${Date.now()}`;
    const i = lista.findIndex((b) => b.id === nuevoId);
    const item = { id: nuevoId, datos, actualizado: Date.now() };
    if (i >= 0) lista[i] = item; else lista.unshift(item);
    escribir(clave("borradores"), lista);
    return nuevoId;
  },
  eliminar(id) { escribir(clave("borradores"), this.todos().filter((b) => b.id !== id)); },
};
