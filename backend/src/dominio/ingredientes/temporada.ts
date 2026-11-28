import { sinAcentos } from './catalogo';

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * ¿El texto de temporada ("Lluvias (junio a octubre)", "Marzo a abril", "Agosto y septiembre", "Todo el año")
 * incluye el mes dado (0 = enero)? Los rangos pueden cruzar el año ("octubre a abril").
 */
export function enTemporada(temporada: string | undefined, mes: number): boolean {
  if (!temporada) return true;
  const t = sinAcentos(temporada);
  if (t.includes('todo el ano')) return true;
  const encontrados = MESES.map((m, i) => ({ i, pos: t.indexOf(m) })).filter((x) => x.pos >= 0)
    .sort((a, b) => a.pos - b.pos).map((x) => x.i);
  if (!encontrados.length) return true;
  if (encontrados.length >= 2 && / a /.test(t)) {
    const [ini, fin] = encontrados;
    return ini <= fin ? mes >= ini && mes <= fin : mes >= ini || mes <= fin;
  }
  return encontrados.includes(mes);
}

/** Mes actual en la hora de México (0 = enero). */
export const mesActual = () =>
  Number(new Intl.DateTimeFormat('en-US', { month: 'numeric', timeZone: 'America/Mexico_City' }).format(new Date())) - 1;
