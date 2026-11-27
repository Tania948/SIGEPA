// Conversión entre las filas normalizadas de la base y el formato JSON que usa el front.
//
// En la base una receta se reparte en varias tablas (ver docs/BASE_DE_DATOS.md):
//   receta ─┬─ municipio ── estado        (dónde)
//           ├─ region, lengua             (catálogos)
//           ├─ receta_ingrediente ── ingrediente
//           ├─ paso
//           └─ usuario                    (portador o portadora)
// serializarReceta() las junta en un solo objeto para la API.
// Para agregar un dato nuevo a la receta: columna en database/esquema.sql y en receta.entity.ts,
// validación en receta.dto.ts, aquí en serializarReceta y en el front.
import { Receta } from '../../database/entidades';

export const DIFICULTADES = ['Fácil', 'Intermedia', 'Avanzada'];
export const TIPOS_PLATILLO = [
  'Plato fuerte', 'Sopa o caldo', 'Antojito', 'Tamal', 'Salsa o mole', 'Guarnición', 'Postre', 'Bebida',
];
/** Cómo permite su portador que se use la receta. */
export const LICENCIAS = {
  'saber-comunitario': 'Saber comunitario: se comparte para conocerlo y preservarlo, citando a la comunidad. No para uso comercial.',
  'cc-by-nc-sa': 'Creative Commons BY-NC-SA 4.0: se puede compartir y adaptar citando a su portador, sin fines comerciales.',
} as const;
export type Licencia = keyof typeof LICENCIAS;

export interface IngredienteJson { cantidad?: string; unidad?: string; nombre: string }
export interface PasoJson { titulo?: string; texto: string }

const FRACCIONES: Record<string, string> = { '0.25': '¼', '0.5': '½', '0.75': '¾', '0.33': '⅓', '0.67': '⅔' };
const FRACCION_A_NUMERO: Record<string, number> = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 0.33, '⅔': 0.67 };

/** DECIMAL de la base -> texto legible: "4.00" -> "4", "0.50" -> "½", "1.50" -> "1½". */
export function cantidadATexto(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return 'Al gusto';
  const n = Number(valor);
  const entero = Math.floor(n);
  const resto = (Math.round((n - entero) * 100) / 100).toString();
  if (FRACCIONES[resto]) return `${entero || ''}${FRACCIONES[resto]}`;
  return String(Math.round(n * 100) / 100);
}

/**
 * Texto que escribe la persona -> número para la columna DECIMAL.
 * Acepta "200", "1.5", "1,5", "1/2", "1 1/2", "½", "1½". Vacío o "al gusto" -> null. Inválido -> undefined.
 */
export function textoACantidad(texto?: string | null): number | null | undefined {
  const t = (texto ?? '').trim().toLowerCase();
  if (!t || t === '—' || t.includes('gusto')) return null;
  const m = t.match(/^(\d+)?\s*([¼½¾⅓⅔])$/);
  if (m) return Number(m[1] ?? 0) + FRACCION_A_NUMERO[m[2]];
  const f = t.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
  if (f) return Number(f[3]) ? Number(f[1] ?? 0) + Number(f[2]) / Number(f[3]) : undefined;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n < 1_000_000 ? Math.round(n * 100) / 100 : undefined;
}

const numero = (v: string | number | null | undefined) => (v === null || v === undefined ? null : Number(v));

export function serializarReceta(r: Receta) {
  const licencia: Licencia = r.licencia in LICENCIAS ? (r.licencia as Licencia) : 'saber-comunitario';
  const estado = r.municipio?.estado;
  const ingredientes: IngredienteJson[] = [...(r.ingredientes ?? [])].sort((a, b) => a.orden - b.orden).map((ri) => ({
    cantidad: cantidadATexto(ri.cantidad),
    unidad: ri.unidad ?? '',
    nombre: ri.nota ? `${ri.ingrediente.nomIngrediente}, ${ri.nota}` : ri.ingrediente.nomIngrediente,
  }));
  const pasos: PasoJson[] = [...(r.pasos ?? [])].sort((a, b) => a.numPaso - b.numPaso)
    .map((p) => ({ ...(p.titulo ? { titulo: p.titulo } : {}), texto: p.texto }));
  return {
    idReceta: r.idReceta,
    nombreReceta: r.nombreReceta,
    descripcion: r.descripcion,
    ingredientes,
    pasos,
    porciones: r.porciones,
    tiempoTotal: r.tiempoTotal,
    dificultad: r.dificultad,
    tipoPlatillo: r.tipoPlatillo,
    region: r.region?.nomRegion ?? null,
    localidad: r.localidad,
    municipio: r.municipio?.nomMunicipio ?? null,
    cveMun: r.cveMun,
    latitud: numero(r.latitud),
    longitud: numero(r.longitud),
    consejo: r.consejo,
    historia: r.historia,
    nombreLengua: r.nombreLengua,
    lengua: r.lengua?.nomLengua ?? null,
    licencia,
    licenciaTexto: LICENCIAS[licencia],
    fechaRegistro: r.fechaRegistro,
    estadoValidacion: r.estadoValidacion,
    urlImagen: r.urlImagen,
    estado: { idEstado: estado?.idEstado ?? Number(r.cveMun.slice(0, 2)), nomEstado: estado?.nomEstado },
    autor: r.usuario ? { idUs: r.usuario.idUs, nombre: `${r.usuario.nombre} ${r.usuario.apPat}` } : { idUs: r.idUsuario, nombre: undefined as string | undefined },
  };
}
export type RecetaPublica = ReturnType<typeof serializarReceta>;
