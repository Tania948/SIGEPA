// Interpreta una pregunta en español y extrae lo que el asistente necesita:
// presupuesto, número de personas, estados, ingredientes, tipo de platillo, tiempo y la intención.
// Es lógica pura (sin base de datos), por eso tiene pruebas en interpretar.spec.ts.
import { Estado } from '../../../database/entidades';
import { Ingrediente, mencionados, sinAcentos } from '../../../dominio/ingredientes/catalogo';

const ALIAS_ESTADOS: Array<[RegExp, number]> = [
  [/\b(cdmx|df|ciudad de mexico|chilangolandia)\b/, 9], [/\b(edomex|estado de mexico|edo\.? ?mex)\b/, 15],
  [/\bbaja california sur\b|\bbcs\b/, 3], [/\bbaja california\b(?! sur)|\bbc\b/, 2], [/\bqroo\b|\bquintana roo\b/, 23],
  [/\bslp\b|\bsan luis\b/, 24], [/\bnuevo leon\b|\bmonterrey\b/, 19], [/\bmerida\b/, 31], [/\bguadalajara\b/, 14],
];
const TIPOS: Array<[RegExp, string]> = [
  [/postre|dulce/, 'Postre'], [/bebida|tomar|atole|agua fresca/, 'Bebida'], [/sopa|caldo/, 'Sopa o caldo'],
  [/antojito|botana/, 'Antojito'], [/tamal/, 'Tamal'], [/salsa|mole\b/, 'Salsa o mole'], [/guarnicion/, 'Guarnición'],
  [/plato fuerte|comida fuerte/, 'Plato fuerte'],
];

export interface Entendido {
  n: string;
  presupuesto: number | null;
  personas: number | null;
  estados: number[];
  ingredientes: Ingrediente[];
  tipo: string | null;
  tiempoMax: number | null;
  facil: boolean;
  origen: boolean;
  precio: boolean;
  temporadaAhora: boolean;
  saludo: boolean;
}

const UNIDADES_TXT: Record<string, number> = {
  un: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
  quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
};
const CIENTOS_TXT: Record<string, number> = {
  cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500,
  seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900,
};
/** "mil quinientos pesos" → "1500 pesos", "somos cinco" → "somos 5". */
export function numerosEnTexto(t: string) {
  const palabra = [...Object.keys(CIENTOS_TXT), ...Object.keys(UNIDADES_TXT), 'mil', 'y'].join('|');
  return t.replace(new RegExp(`\\b(?:(?:${palabra})\\s*)+\\b`, 'g'), (frase) => {
    const ps = frase.trim().split(/\s+/).filter((p) => p !== 'y');
    if (!ps.length || (ps.length === 1 && !(ps[0] in CIENTOS_TXT) && !(ps[0] in UNIDADES_TXT) && ps[0] !== 'mil')) return frase;
    let total = 0; let actual = 0;
    for (const p of ps) {
      if (p === 'mil') { total += (actual || 1) * 1000; actual = 0; } else actual += CIENTOS_TXT[p] ?? UNIDADES_TXT[p] ?? 0;
    }
    const valor = total + actual;
    return valor ? `${valor} ` : frase;
  });
}

export function entender(mensaje: string, estados: Estado[]): Entendido {
  const n = numerosEnTexto(sinAcentos(mensaje).replace(/(\d),(\d{3})/g, '$1$2').replace(/[¿?¡!,;]/g, ' ')).replace(/\s+/g, ' ');
  const dinero = n.match(/\$\s*(\d[\d,]*(?:\.\d+)?)/) ?? n.match(/(\d[\d,]*(?:\.\d+)?)\s*(pesos|varos|baros|pesitos|mxn)/)
    ?? n.match(/presupuesto (?:de|es)?\s*(\d[\d,]*)/);
  const presupuesto = dinero ? Number(dinero[1].replace(/,/g, '')) : null;
  const gente = n.match(/(?:para|somos)\s*(\d+)\s*(personas|gentes?|comensales|adultos|de familia)?/);
  const personas = gente && (gente[2] || /somos/.test(gente[0])) ? Number(gente[1]) : null;

  const idsEstados = new Set<number>();
  [...estados].sort((a, b) => b.nomEstado.length - a.nomEstado.length).forEach((e) => {
    const nom = sinAcentos(e.nomEstado);
    if (nom === 'mexico') return;
    const re = new RegExp(`\\b${nom}\\b${nom === 'baja california' ? '(?! sur)' : ''}`);
    if (re.test(n)) idsEstados.add(e.idEstado);
  });
  ALIAS_ESTADOS.forEach(([re, id]) => { if (re.test(n)) idsEstados.add(id); });
  if (idsEstados.has(3)) idsEstados.delete(2);

  const minutos = n.match(/(?:menos de|maximo|max|en)\s*(\d+)\s*(min|minutos)/);
  const horas = n.match(/(?:menos de|maximo|en)\s*(una|1|2|dos)\s*horas?/);
  const tiempoMax = minutos ? Number(minutos[1]) : horas ? (/(2|dos)/.test(horas[1]) ? 120 : 60) : /rapid|rapid|sencill|express/.test(n) ? 45 : null;

  const ingredientes = mencionados(n).filter((i) => !['agua', 'sal'].includes(i.id) || new RegExp(`\\b${i.id}\\b`).test(n));
  return {
    n,
    presupuesto: presupuesto && presupuesto > 0 ? presupuesto : null,
    personas: personas && personas > 0 && personas < 200 ? personas : null,
    estados: [...idsEstados],
    ingredientes,
    tipo: TIPOS.find(([re]) => re.test(n))?.[1] ?? null,
    tiempoMax,
    facil: /facil|sencill|principiante/.test(n),
    origen: /recolect|recoge|recoger|junta[rn]?|cosecha|consig|encuentr|se da\b|se dan\b|crece|de donde (viene|es|son)|origen|donde hay|donde (lo|la|los|las) (compro|venden|hay)|donde comprar|donde se (compra|vende|siembra|cultiva|produce)|silvestre|temporada/.test(n),
    precio: /cuanto cuesta|cuanto vale|precio|a como|cuanto sale|que tan caro/.test(n),
    temporadaAhora: /ahora|este mes|en esta temporada|de temporada|hoy/.test(n),
    saludo: /^(hola|buen[oa]s|que tal|hey|ayuda|que puedes hacer|como funcionas|quien eres)\b/.test(n.trim()) && n.trim().split(/\s+/).length <= 6,
  };
}

/** ¿El ingrediente de la receta corresponde al buscado? (el ayocote cuenta como frijol, la pechuga como pollo) */

/** ¿El ingrediente de la receta corresponde al buscado? (el ayocote cuenta como frijol, la pechuga como pollo) */
export const mismoIngrediente = (de: Ingrediente | null, buscado: Ingrediente) => !!de && (de.id === buscado.id || de.familia === buscado.id);
