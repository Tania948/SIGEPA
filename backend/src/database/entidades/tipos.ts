/**
 * Catálogo de roles (el diccionario pide "definir catálogo de roles" para tipoUsu):
 * 1 = administrador (moderador), 2 = usuario (explora y guarda recetas), 3 = portador de saberes (publica recetas).
 */
export enum TipoUsuario { ADMINISTRADOR = 1, REGULAR = 2, PORTADOR = 3 }
export type EstadoValidacion = 'pendiente' | 'validada' | 'rechazada';
export type EstadoComentario = 'publicado' | 'oculto' | 'eliminado';
