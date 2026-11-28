// Costo estimado de una receta con los precios de referencia del catálogo.
// Lógica pura (sin base de datos), por eso tiene pruebas unitarias en costos.spec.ts.
import { Ingrediente, identificar, sinAcentos } from './catalogo';

export interface IngredienteReceta { cantidad?: string | number | null; unidad?: string | null; nombre: string }
export interface LineaCosto { nombre: string; cantidad: string; costo: number; estimado: boolean }
export interface Costo { total: number; porPorcion: number; porciones: number; lineas: LineaCosto[]; sinPrecio: number }

/** Costo que se asume para un ingrediente que no está en el catálogo. */
export const COSTO_DESCONOCIDO = 10;

const FRACCIONES: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };

/** "1 1/2", "½", "2½", "0.5", "1,5" → número. Vacío o "al gusto" → null. */
export function leerCantidad(c: unknown): number | null {
  const t = String(c ?? '').trim().replace(',', '.');
  if (!t) return null;
  if (FRACCIONES[t] != null) return FRACCIONES[t];
  const mixto = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixto) return Number(mixto[1]) + Number(mixto[2]) / Number(mixto[3]);
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const conSimbolo = t.match(/^(\d+)\s*([½¼¾])$/);
  if (conSimbolo) return Number(conSimbolo[1]) + FRACCIONES[conSimbolo[2]];
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Convierte "cantidad + unidad" de la receta a la unidad base del ingrediente del catálogo. */
export function enUnidadBase(cant: number, unidad: string, ing: Ingrediente): number {
  const u = sinAcentos(unidad || '').replace(/\.$/, '');
  const peso = ing.pesoPieza;
  let kg: number | null = null; let piezas: number | null = null; let manojos: number | null = null;
  if (u === 'g' || u === 'gr' || u === 'gramos') kg = cant / 1000;
  else if (u === 'kg' || u === 'kilo' || u === 'kilos') kg = cant;
  else if (u === 'ml') kg = cant / 1000;
  else if (/^(l|litro|litros)$/.test(u)) kg = cant;
  else if (/^tazas?$/.test(u)) kg = cant * (ing.taza ?? 0.2);
  else if (/^cucharadas?$/.test(u)) kg = cant * 0.015;
  else if (/^cucharaditas?$/.test(u)) kg = cant * 0.005;
  else if (/^pizcas?$/.test(u)) kg = cant * 0.001;
  else if (/^ramitas?$/.test(u)) manojos = cant / 8;
  else if (/^hojas?$/.test(u)) manojos = cant / 20;
  else if (/^manojos?$/.test(u)) manojos = cant;
  else piezas = cant; // piezas, dientes, pencas o sin unidad

  if (ing.unidad === 'kg' || ing.unidad === 'l') {
    if (kg != null) return kg;
    if (piezas != null) return piezas * (peso ?? 0.1);
    return (manojos ?? 0) * 0.1;
  }
  if (ing.unidad === 'pieza') {
    if (piezas != null) return piezas;
    if (kg != null) return kg / (peso ?? 0.25);
    return manojos ?? 0;
  }
  if (manojos != null) return manojos;
  if (kg != null) return kg / 0.1;
  return (piezas ?? 0) / 8;
}

/** Costo de un renglón de ingredientes. */
export function costoIngrediente(i: IngredienteReceta): LineaCosto {
  const ing = identificar(i.nombre);
  const cant = leerCantidad(i.cantidad);
  const cantidad = [i.cantidad, i.unidad].filter((x) => x && x !== '—').join(' ');
  if (!ing) return { nombre: i.nombre, cantidad, costo: COSTO_DESCONOCIDO, estimado: false };
  // "pavo de 4 kg", "pargo de 2 kg": el peso viene en el nombre
  const pesoNombre = sinAcentos(i.nombre).match(/de (\d+(?:\.\d+)?) ?kg/);
  if (pesoNombre && cant != null && ing.unidad === 'kg' && !/^(g|kg|ml|l|litros?)$/.test(sinAcentos(i.unidad ?? ''))) {
    return { nombre: i.nombre, cantidad, costo: Math.round(cant * Number(pesoNombre[1]) * ing.precio), estimado: true };
  }
  const costo = cant == null ? Math.min(ing.precio * 0.02, 5) : enUnidadBase(cant, i.unidad ?? '', ing) * ing.precio;
  return { nombre: i.nombre, cantidad, costo: Math.round(costo * 10) / 10, estimado: true };
}

/**
 * Costo de una receta. Si se pide otro número de personas, escala el costo de forma lineal.
 * Las cantidades de la lista siguen siendo las de la receta original.
 */
export function costoReceta(ingredientes: IngredienteReceta[], porciones: number | null | undefined, personas?: number): Costo {
  const base = Number(porciones) || 4;
  const factor = personas ? personas / base : 1;
  const lineas = ingredientes.map(costoIngrediente).map((l) => ({ ...l, costo: Math.round(l.costo * factor * 10) / 10 }));
  const total = Math.round(lineas.reduce((s, l) => s + l.costo, 0));
  const para = personas || base;
  return { total, porPorcion: Math.round(total / para), porciones: para, lineas, sinPrecio: lineas.filter((l) => !l.estimado).length };
}
