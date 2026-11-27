// Formato de las columnas TEXT de la tabla Receta (diccionario de datos 10.2):
//
//  ingredientes -> [{ "cantidad": "700", "unidad": "g", "nombre": "pollo en piezas" }, ...]
//  preparacion  -> {
//     "pasos": [{ "titulo": "Prepara los ingredientes", "texto": "Lava los vegetales..." }],
//     "porciones": 4, "tiempoTotal": 60, "dificultad": "Intermedia", "tipoPlatillo": "Plato fuerte",
//     "region": "Valles Centrales", "municipio": "San Pablo Villa de Mitla", "cveMun": "20068",
//     "localidad": "Mitla", "latitud": 16.92, "longitud": -96.36,
//     "consejo": "...", "historia": "...", "pieFoto": "...",
//     "nombreLengua": "Tikin xiik'", "lengua": "Maya yucateco",
//     "licencia": "saber-comunitario" | "cc-by-nc-sa", "consentimiento": true
//  }
//
// Así el esquema queda igual al diccionario y la receta guarda todo lo que pide el diseño.
// Para agregar un dato nuevo a la receta: súmalo aquí (serializarReceta), en receta.dto.ts y en el front.
import { leerJson } from '../../common/utils/json';
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

export function serializarReceta(r: Receta) {
  const ingredientes = leerJson<IngredienteJson[]>(r.ingredientes, []);
  const prep = leerJson<Record<string, any>>(r.preparacion, {});
  // Si la preparación se capturó como texto plano (fuera de la API), se muestra como un solo paso.
  const pasos: PasoJson[] = Array.isArray(prep.pasos) ? prep.pasos
    : r.preparacion && !r.preparacion.trim().startsWith('{') ? [{ texto: r.preparacion }] : [];
  const licencia: Licencia = prep.licencia in LICENCIAS ? prep.licencia : 'saber-comunitario';
  return {
    idReceta: r.idReceta,
    nombreReceta: r.nombreReceta,
    descripcion: r.descripcion,
    ingredientes: Array.isArray(ingredientes) ? ingredientes : [],
    pasos,
    porciones: prep.porciones ?? null,
    tiempoTotal: prep.tiempoTotal ?? null,
    dificultad: prep.dificultad ?? null,
    tipoPlatillo: prep.tipoPlatillo ?? null,
    region: prep.region ?? null,
    localidad: prep.localidad ?? null,
    municipio: prep.municipio ?? null,
    cveMun: prep.cveMun ?? null,
    latitud: prep.latitud ?? null,
    longitud: prep.longitud ?? null,
    consejo: prep.consejo ?? null,
    historia: prep.historia ?? null,
    pieFoto: prep.pieFoto ?? null,
    nombreLengua: prep.nombreLengua ?? null,
    lengua: prep.lengua ?? null,
    licencia,
    licenciaTexto: LICENCIAS[licencia],
    fechaRegistro: r.fechaRegistro,
    estadoValidacion: r.estadoValidacion,
    urlImagen: r.urlImagen,
    estado: r.estado ? { idEstado: r.estado.idEstado, nomEstado: r.estado.nomEstado } : { idEstado: r.idEstado, nomEstado: undefined as string | undefined },
    autor: r.usuario ? { idUs: r.usuario.idUs, nombre: `${r.usuario.nombre} ${r.usuario.apPat}` } : { idUs: r.idUsuario, nombre: undefined as string | undefined },
  };
}
export type RecetaPublica = ReturnType<typeof serializarReceta>;

/** Expresión SQL que lee un campo del JSON guardado en receta.preparacion (MySQL 8, MariaDB y TiDB). */
export const campoPrep = (campo: string) =>
  `(CASE WHEN JSON_VALID(r.preparacion) THEN JSON_UNQUOTE(JSON_EXTRACT(r.preparacion, '$.${campo}')) END)`;
