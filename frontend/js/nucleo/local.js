// Favoritos: se guardan en la base (tabla favorito, /api/usuarios/yo/favoritos). Aquí se lleva una copia
// en el navegador para pintar los marcadores al instante; se sincroniza con la API al cargar cada página.
// Borradores: viven solo en este dispositivo (una receta a medias no se manda a la base).
import { api, sesion } from "./api.js";

function leer(clave, porDefecto) {
  try { return JSON.parse(localStorage.getItem(clave)) ?? porDefecto; } catch { return porDefecto; }
}
function escribir(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
}
const clave = (tipo) => `sigepa.${tipo}.${sesion.usuario?.idUs ?? "anonimo"}`;

let sincronizando = null;

export const favoritos = {
  /** [{ id, fecha }] del más reciente al más antiguo (copia local de la tabla favorito). */
  todos() { return leer(clave("favoritos"), []); },
  ids() { return this.todos().map((f) => f.id); },
  tiene(id) { return this.ids().includes(Number(id)); },
  /** Trae los favoritos de la base. Avisa con el evento "sigepa:favoritos" cuando cambian. */
  sincronizar() {
    if (!sesion.activa) return Promise.resolve(this.todos());
    sincronizando ??= api("/usuarios/yo/favoritos").then((lista) => {
      const antes = JSON.stringify(this.ids());
      escribir(clave("favoritos"), lista.map((f) => ({ id: f.idReceta, fecha: Date.parse(f.fechaFavorito) })));
      if (JSON.stringify(this.ids()) !== antes) document.dispatchEvent(new CustomEvent("sigepa:favoritos"));
      return this.todos();
    }).catch(() => this.todos()).finally(() => { sincronizando = null; });
    return sincronizando;
  },
  agregar(id) {
    const lista = this.todos().filter((f) => f.id !== Number(id));
    lista.unshift({ id: Number(id), fecha: Date.now() });
    escribir(clave("favoritos"), lista);
    api(`/usuarios/yo/favoritos/${Number(id)}`, { metodo: "PUT" }).catch(() => this.sincronizar());
  },
  quitar(id) {
    escribir(clave("favoritos"), this.todos().filter((f) => f.id !== Number(id)));
    api(`/usuarios/yo/favoritos/${Number(id)}`, { metodo: "DELETE" }).catch(() => this.sincronizar());
  },
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
