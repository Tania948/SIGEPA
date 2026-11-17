// Asistente de SIGEPA: responde preguntas sobre recetas, presupuesto y origen de ingredientes,
// y devuelve qué mostrar en el mapa (pines de recetas y estados resaltados).
//
// Funciona sin servicios externos: entiende la pregunta con reglas y calcula con los datos de la base
// y del catálogo de ingredientes. Si en .env hay ANTHROPIC_API_KEY, además usa un modelo de lenguaje
// (Claude) solo para redactar la respuesta con esos mismos datos; si falla, responde con el texto local.
import { Body, Controller, Injectable, Module, Post } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Repository } from 'typeorm';
import { Estado, Receta } from '../entities';
import { serializarReceta } from '../recetas/recetas';
import { INGREDIENTES, Ingrediente, identificar, mencionados, sinAcentos } from './ingredientes';

/* ---------------------------------------------------------------- DTOs */
class TurnoDto {
  @IsIn(['usuario', 'asistente']) rol: 'usuario' | 'asistente';
  @IsString() @MaxLength(2000) texto: string;
}
export class PreguntaDto {
  @IsString() @MinLength(1) @MaxLength(500) mensaje: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TurnoDto) historial?: TurnoDto[];
}

/* ---------------------------------------------------------------- Tipos de respuesta */
type RecetaS = ReturnType<typeof serializarReceta>;
interface Costo { total: number; porPorcion: number; lineas: LineaCosto[]; sinPrecio: number }
interface LineaCosto { nombre: string; cantidad: string; costo: number; estimado: boolean }
export interface Respuesta {
  texto: string;
  intencion: string;
  recetas: Array<Pick<RecetaS, 'idReceta' | 'nombreReceta' | 'urlImagen' | 'porciones' | 'tiempoTotal' | 'tipoPlatillo' | 'municipio' | 'localidad'>
    & { estado: string; idEstado: number; costo?: number; porPorcion?: number }>;
  lista?: { titulo: string; lineas: LineaCosto[]; total: number; nota?: string };
  ingredientes?: Array<{ nombre: string; tipo: string; temporada?: string; donde: string; cuidado?: string; estados: string[]; precio: string }>;
  mapa: { puntos: Array<{ idReceta: number; nombreReceta: string; latitud: number; longitud: number; localidad?: string; municipio?: string; estado: { nomEstado: string } }>;
    estados: number[]; enlace?: string };
  sugerencias: string[];
  fuente: 'local' | 'ia';
}

/* ---------------------------------------------------------------- Cantidades y costos */
const FRACCIONES: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
function leerCantidad(c: unknown): number | null {
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
function enUnidadBase(cant: number, unidad: string, ing: Ingrediente): number {
  const u = sinAcentos(unidad || '').replace(/\.$/, '');
  const peso = ing.pesoPieza;
  // 1) a una medida común: kg (o litros, densidad ≈ 1), piezas o manojos
  let kg: number | null = null; let piezas: number | null = null; let manojos: number | null = null;
  if (u === 'g' || u === 'gr' || u === 'gramos') kg = cant / 1000;
  else if (u === 'kg' || u === 'kilo' || u === 'kilos') kg = cant;
  else if (u === 'ml') kg = cant / 1000;
  else if (/^(l|litro|litros)$/.test(u)) kg = cant;
  else if (/^tazas?$/.test(u)) kg = cant * (ing.taza ?? 0.2);
  else if (/^cucharadas?$/.test(u)) kg = cant * 0.015;
  else if (/^cucharaditas?$/.test(u)) kg = cant * 0.005;
  else if (/^pizcas?$/.test(u)) kg = cant * 0.001;
  else if (/^(ramitas?)$/.test(u)) manojos = cant / 8;
  else if (/^(hojas?)$/.test(u)) manojos = cant / 20;
  else if (/^manojos?$/.test(u)) manojos = cant;
  else piezas = cant; // piezas, dientes, pencas o sin unidad
  // 2) a la unidad base del catálogo
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
  // manojo
  if (manojos != null) return manojos;
  if (kg != null) return kg / 0.1;
  return (piezas ?? 0) / 8;
}

function costoReceta(r: RecetaS): Costo {
  const lineas: LineaCosto[] = r.ingredientes.map((i) => {
    const ing = identificar(i.nombre);
    const cant = leerCantidad(i.cantidad);
    const cantidad = [i.cantidad, i.unidad].filter((x) => x && x !== '—').join(' ');
    if (!ing) return { nombre: i.nombre, cantidad, costo: 10, estimado: false };
    // "pavo de 4 kg", "pargo de 2 kg": el peso viene en el nombre
    const pesoNombre = sinAcentos(i.nombre).match(/de (\d+(?:\.\d+)?) ?kg/);
    if (pesoNombre && cant != null && ing.unidad === 'kg' && !/^(g|kg|ml|l|litros?)$/.test(sinAcentos(i.unidad ?? ''))) {
      return { nombre: i.nombre, cantidad, costo: Math.round(cant * Number(pesoNombre[1]) * ing.precio), estimado: true };
    }
    const costo = cant == null ? Math.min(ing.precio * 0.02, 5) : enUnidadBase(cant, i.unidad ?? "", ing) * ing.precio;
    return { nombre: i.nombre, cantidad, costo: Math.round(costo * 10) / 10, estimado: true };
  });
  const total = Math.round(lineas.reduce((s, l) => s + l.costo, 0));
  const porciones = Number(r.porciones) || 4;
  return { total, porPorcion: Math.round(total / porciones), lineas, sinPrecio: lineas.filter((l) => !l.estimado).length };
}

/* ---------------------------------------------------------------- Entender la pregunta */
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function enTemporada(temporada: string | undefined, mes: number): boolean {
  if (!temporada) return true;
  const t = sinAcentos(temporada);
  if (t.includes('todo el ano')) return true;
  const encontrados = MESES.map((m, i) => ({ i, pos: t.indexOf(m) })).filter((x) => x.pos >= 0).sort((a, b) => a.pos - b.pos).map((x) => x.i);
  if (!encontrados.length) return true;
  if (encontrados.length >= 2 && / a /.test(t)) {
    const [ini, fin] = encontrados;
    return ini <= fin ? mes >= ini && mes <= fin : mes >= ini || mes <= fin;
  }
  return encontrados.includes(mes);
}
const mesActual = () => Number(new Intl.DateTimeFormat('en-US', { month: 'numeric', timeZone: 'America/Mexico_City' }).format(new Date())) - 1;

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

interface Entendido {
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
function numerosEnTexto(t: string) {
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

function entender(mensaje: string, estados: Estado[]): Entendido {
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
const mismoIngrediente = (de: Ingrediente | null, buscado: Ingrediente) => !!de && (de.id === buscado.id || de.familia === buscado.id);

/* ---------------------------------------------------------------- Servicio */
const SUGERENCIAS_BASE = [
  'Tengo 200 pesos, ¿qué puedo cocinar para 4 personas?',
  '¿Dónde se recolecta la hierba santa?',
  '¿Qué se recolecta en Oaxaca en esta temporada?',
  'Recetas rápidas de Yucatán',
];
const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-MX')}`;

@Injectable()
export class AsistenteService {
  private cache: { hasta: number; recetas: RecetaS[]; estados: Estado[] } | null = null;

  constructor(
    @InjectRepository(Receta) private readonly recetas: Repository<Receta>,
    @InjectRepository(Estado) private readonly estadosRepo: Repository<Estado>,
  ) {}

  private async datos() {
    if (this.cache && this.cache.hasta > Date.now()) return this.cache;
    const [filas, estados] = await Promise.all([
      this.recetas.find({ where: { estadoValidacion: 'validada' }, relations: { estado: true, usuario: true } }),
      this.estadosRepo.find(),
    ]);
    this.cache = { hasta: Date.now() + 30_000, recetas: filas.map(serializarReceta), estados };
    return this.cache;
  }

  async responder(dto: PreguntaDto): Promise<Respuesta> {
    const { recetas, estados } = await this.datos();
    const e = entender(dto.mensaje, estados);
    const nomEstado = (id: number) => estados.find((x) => x.idEstado === id)?.nomEstado ?? '';

    let r: Respuesta;
    if (e.saludo) r = this.saludo();
    else if (e.presupuesto) r = this.presupuesto(e, recetas, nomEstado);
    else if (e.precio && e.ingredientes.length) r = this.precioIngrediente(e, recetas, nomEstado);
    else if (e.origen && (e.ingredientes.some((i) => i.origen) || e.estados.length || e.temporadaAhora)) r = this.origen(e, recetas, nomEstado);
    else r = this.buscar(e, recetas, nomEstado);

    const ia = await this.redactarConIa(dto, r).catch(() => null);
    if (ia) { r.texto = ia; r.fuente = 'ia'; }
    return r;
  }

  /* ----- Filtros comunes ----- */
  private filtrar(e: Entendido, recetas: RecetaS[], { conIngredientes = true } = {}) {
    return recetas.filter((r) =>
      (!e.estados.length || e.estados.includes(r.estado.idEstado))
      && (!e.tipo || r.tipoPlatillo === e.tipo)
      && (!e.tiempoMax || (Number(r.tiempoTotal) || 999) <= e.tiempoMax)
      && (!e.facil || r.dificultad === 'Fácil')
      && (!conIngredientes || !e.ingredientes.length || e.ingredientes.every((ing) =>
        r.ingredientes.some((i) => mismoIngrediente(identificar(i.nombre), ing)))));
  }

  private tarjeta(r: RecetaS, costo?: Costo) {
    return {
      idReceta: r.idReceta, nombreReceta: r.nombreReceta, urlImagen: r.urlImagen, porciones: r.porciones, tiempoTotal: r.tiempoTotal,
      tipoPlatillo: r.tipoPlatillo, municipio: r.municipio, localidad: r.localidad,
      estado: (r.estado as { nomEstado?: string }).nomEstado ?? '', idEstado: r.estado.idEstado,
      ...(costo ? { costo: costo.total, porPorcion: costo.porPorcion } : {}),
    };
  }

  private puntos(lista: RecetaS[]) {
    return lista.filter((r) => r.latitud != null && r.longitud != null).map((r) => ({
      idReceta: r.idReceta, nombreReceta: r.nombreReceta, latitud: Number(r.latitud), longitud: Number(r.longitud),
      localidad: r.localidad ?? undefined, municipio: r.municipio ?? undefined, estado: { nomEstado: (r.estado as { nomEstado?: string }).nomEstado ?? '' },
    }));
  }

  private describirFiltros(e: Entendido, nomEstado: (id: number) => string) {
    return [
      e.estados.length ? `de ${e.estados.map(nomEstado).join(' o ')}` : '',
      e.ingredientes.length ? `con ${e.ingredientes.map((i) => i.nombre.toLowerCase()).join(' y ')}` : '',
      e.tipo ? `(${e.tipo.toLowerCase()})` : '',
      e.tiempoMax ? `de ${e.tiempoMax} minutos o menos` : '',
      e.facil ? 'fáciles' : '',
    ].filter(Boolean).join(' ');
  }

  /* ----- Intenciones ----- */
  private saludo(): Respuesta {
    return {
      intencion: 'saludo', fuente: 'local', recetas: [], mapa: { puntos: [], estados: [] }, sugerencias: SUGERENCIAS_BASE,
      texto: 'Hola, soy el asistente de SIGEPA. Puedo ayudarte a:\n'
        + '- **Cocinar con tu presupuesto:** dime cuánto tienes y para cuántas personas.\n'
        + '- **Saber de dónde viene un ingrediente** y dónde se recolecta o se consigue, con el mapa.\n'
        + '- **Encontrar recetas** por estado, ingrediente o tiempo.\n'
        + 'Los precios son estimaciones de referencia y cambian según la región y la temporada.',
    };
  }

  private presupuesto(e: Entendido, recetas: RecetaS[], nomEstado: (id: number) => string): Respuesta {
    const monto = e.presupuesto!;
    const candidatas = this.filtrar(e, recetas).map((r) => {
      const c = costoReceta(r);
      const factor = e.personas ? e.personas / (Number(r.porciones) || 4) : 1;
      const total = Math.round(c.total * factor);
      return { r, c: { ...c, total, lineas: c.lineas.map((l) => ({ ...l, costo: Math.round(l.costo * factor * 10) / 10 })) } };
    });
    const alcanzan = candidatas.filter((x) => x.c.total <= monto).sort((a, b) => b.c.total - a.c.total);
    const para = e.personas ? ` para ${e.personas} personas` : '';
    const filtros = this.describirFiltros(e, nomEstado);

    if (!alcanzan.length) {
      const baratas = candidatas.sort((a, b) => a.c.total - b.c.total).slice(0, 4);
      return {
        intencion: 'presupuesto', fuente: 'local',
        texto: baratas.length
          ? `Con **${pesos(monto)}**${para} no alcanza para ninguna receta ${filtros} completa, según precios de referencia. `
            + `La más económica es **${baratas[0].r.nombreReceta}**: cuesta unos **${pesos(baratas[0].c.total)}**${para}. `
            + 'Puedes cocinar menos porciones o cambiar la carne por frijol, huevo o verduras de temporada.'
          : `No encontré recetas ${filtros}. Prueba con menos filtros.`,
        recetas: baratas.map((x) => this.tarjeta(x.r, x.c)),
        mapa: { puntos: this.puntos(baratas.map((x) => x.r)), estados: e.estados },
        sugerencias: ['Tengo 300 pesos para 4 personas', 'Recetas fáciles con frijol', '¿Qué se recolecta en esta temporada?'],
      };
    }
    const elegida = alcanzan[0];
    const sobra = monto - elegida.c.total;
    const mostrar = alcanzan.slice(0, 6);
    const masBarata = alcanzan[alcanzan.length - 1];
    return {
      intencion: 'presupuesto', fuente: 'local',
      texto: `Con **${pesos(monto)}**${para} te alcanza para **${alcanzan.length} ${alcanzan.length === 1 ? 'receta' : 'recetas'}**${filtros ? ` ${filtros}` : ''}.\n`
        + `- La que mejor aprovecha tu dinero es **${elegida.r.nombreReceta}** (${nomEstado(elegida.r.estado.idEstado)}): unos **${pesos(elegida.c.total)}**`
        + `${sobra >= 1 ? ` y te sobran ${pesos(sobra)}` : ''}. Abajo está su lista de compras.\n`
        + (masBarata !== elegida ? `- La más económica es **${masBarata.r.nombreReceta}**: unos ${pesos(masBarata.c.total)}.\n` : '')
        + 'En el mapa ves de dónde es cada receta. Los precios son aproximados: en mercados y tianguis suelen salir más baratos.',
      recetas: mostrar.map((x) => this.tarjeta(x.r, x.c)),
      lista: {
        titulo: `Lista de compras · ${elegida.r.nombreReceta}${para}`, lineas: elegida.c.lineas, total: elegida.c.total,
        nota: e.personas && e.personas !== Number(elegida.r.porciones)
          ? `Cantidades de la receta original (${elegida.r.porciones} porciones); el costo ya está ajustado a ${e.personas} personas.` : undefined,
      },
      mapa: { puntos: this.puntos(mostrar.map((x) => x.r)), estados: e.estados },
      sugerencias: [
        `Tengo ${pesos(Math.max(50, Math.round(monto / 2)))}, ¿qué puedo cocinar?`,
        `Tengo ${pesos(monto)} y somos ${(e.personas ?? 4) + 2}`,
        ...this.conOrigen(elegida.r).slice(0, 1).map((i) => `¿Dónde se consigue ${i.nombre.split(' (')[0].toLowerCase()}?`),
      ],
    };
  }

  /** Ingredientes de una receta que tienen datos de origen (para sugerir preguntas). */
  private conOrigen(r: RecetaS) {
    return r.ingredientes.map((i) => identificar(i.nombre)).filter((i): i is Ingrediente => !!i?.origen);
  }

  private fichaIngrediente(i: Ingrediente, nomEstado: (id: number) => string) {
    const tipos = { recoleccion: 'Se recolecta', cultivo: 'Se cultiva', pesca: 'Se pesca', crianza: 'Se cría', elaborado: 'Se elabora' };
    const unidad = { kg: 'kg', pieza: 'pieza', l: 'litro', manojo: 'manojo' }[i.unidad];
    return {
      nombre: i.nombre, tipo: i.origen ? tipos[i.origen.tipo] : 'Se compra en mercados', temporada: i.origen?.temporada,
      donde: i.origen?.donde ?? 'Se consigue en mercados y tiendas de todo el país.', cuidado: i.origen?.cuidado,
      estados: (i.origen?.estados ?? []).map(nomEstado), precio: i.precio ? `≈ ${pesos(i.precio)} por ${unidad}` : 'Sin costo',
    };
  }

  private recetasCon(ings: Ingrediente[], recetas: RecetaS[]) {
    return recetas.filter((r) => r.ingredientes.some((x) => { const i = identificar(x.nombre); return ings.some((b) => mismoIngrediente(i, b)); }));
  }

  private origen(e: Entendido, recetas: RecetaS[], nomEstado: (id: number) => string): Respuesta {
    const conOrigen = e.ingredientes.filter((i) => i.origen);
    const mes = mesActual();
    if (conOrigen.length) {
      const fichas = conOrigen.slice(0, 3);
      const usan = this.recetasCon(fichas, recetas).slice(0, 6);
      const ids = [...new Set(fichas.flatMap((i) => i.origen!.estados))];
      const texto = fichas.map((i) => {
        const o = i.origen!;
        const tipo = { recoleccion: 'se recolecta', cultivo: 'se cultiva', pesca: 'se pesca', crianza: 'se cría', elaborado: 'se elabora' }[o.tipo];
        return `**${i.nombre}** ${tipo} sobre todo en ${o.estados.slice(0, 5).map(nomEstado).join(', ')}${o.estados.length > 5 ? ' y otros estados' : ''}. `
          + `${o.donde}${o.temporada ? ` Temporada: ${o.temporada.toLowerCase()}${enTemporada(o.temporada, mes) ? ' (es temporada ahora).' : '.'}` : ''}`
          + `${o.cuidado ? `\n- ${o.cuidado}` : ''}`;
      }).join('\n\n');
      return {
        intencion: 'origen', fuente: 'local',
        texto: `${texto}\n\nEn el mapa están resaltados los estados donde se da${usan.length ? ' y los pines de recetas que lo usan' : ''}.`,
        ingredientes: fichas.map((i) => this.fichaIngrediente(i, nomEstado)),
        recetas: usan.map((r) => this.tarjeta(r)),
        mapa: { puntos: this.puntos(usan), estados: ids, enlace: ids.length === 1 ? `estado.html?id=${ids[0]}` : undefined },
        sugerencias: [`¿Cuánto cuesta ${fichas[0].nombre.split(' (')[0].toLowerCase()}?`, '¿Qué se recolecta en esta temporada?', 'Tengo 150 pesos, ¿qué cocino?'],
      };
    }
    // "¿Qué se recolecta en Oaxaca (ahora)?"
    const lista = INGREDIENTES.filter((i) => i.origen
      && (!e.estados.length || i.origen.estados.some((id) => e.estados.includes(id)))
      && (!e.temporadaAhora || enTemporada(i.origen.temporada, mes)))
      .sort((a, b) => Number(b.origen!.tipo === 'recoleccion') - Number(a.origen!.tipo === 'recoleccion'))
      .slice(0, 8);
    const lugar = e.estados.length ? ` en ${e.estados.map(nomEstado).join(' y ')}` : '';
    const cuando = e.temporadaAhora ? ` en ${MESES[mes]}` : '';
    if (!lista.length) {
      return { ...this.buscar(e, recetas, nomEstado), texto: `No tengo registrados ingredientes que se recolecten o cultiven${lugar}${cuando}. Te muestro recetas de la zona.` };
    }
    const usan = this.filtrar({ ...e, ingredientes: [] }, this.recetasCon(lista, recetas)).slice(0, 6);
    return {
      intencion: 'origen', fuente: 'local',
      texto: `Ingredientes que se recolectan o cultivan${lugar}${cuando}:\n`
        + lista.map((i) => `- **${i.nombre}**: ${i.origen!.tipo === 'recoleccion' ? 'recolección' : i.origen!.tipo}, ${(i.origen!.temporada ?? 'todo el año').toLowerCase()}.`).join('\n')
        + '\nRecolecta con permiso de quien cuida el terreno y sin arrancar las plantas.',
      ingredientes: lista.map((i) => this.fichaIngrediente(i, nomEstado)),
      recetas: usan.map((r) => this.tarjeta(r)),
      mapa: { puntos: this.puntos(usan), estados: e.estados.length ? e.estados : [...new Set(lista.flatMap((i) => i.origen!.estados))],
        enlace: e.estados.length === 1 ? `estado.html?id=${e.estados[0]}` : undefined },
      sugerencias: lista.slice(0, 2).map((i) => `¿Dónde se recolecta ${i.nombre.split(' (')[0].toLowerCase()}?`).concat('Tengo 200 pesos para 4 personas'),
    };
  }

  private precioIngrediente(e: Entendido, recetas: RecetaS[], nomEstado: (id: number) => string): Respuesta {
    const fichas = e.ingredientes.slice(0, 4);
    const usan = this.recetasCon(fichas, recetas).slice(0, 6);
    return {
      intencion: 'precio', fuente: 'local',
      texto: fichas.map((i) => `- **${i.nombre}**: ${this.fichaIngrediente(i, nomEstado).precio}`).join('\n')
        + '\nSon precios de referencia aproximados (Profeco y SNIIM, 2026). Varían por región, temporada y lugar de compra.',
      ingredientes: fichas.map((i) => this.fichaIngrediente(i, nomEstado)),
      recetas: usan.map((r) => this.tarjeta(r, costoReceta(r))),
      mapa: { puntos: this.puntos(usan), estados: [...new Set(fichas.flatMap((i) => i.origen?.estados ?? []))] },
      sugerencias: [`¿Dónde se consigue ${fichas[0].nombre.split(' (')[0].toLowerCase()}?`, 'Tengo 250 pesos para 5 personas'],
    };
  }

  private buscar(e: Entendido, recetas: RecetaS[], nomEstado: (id: number) => string): Respuesta {
    let lista = this.filtrar(e, recetas);
    const hayFiltros = e.estados.length || e.ingredientes.length || e.tipo || e.tiempoMax || e.facil;
    if (!hayFiltros) {
      const palabras = e.n.split(/\s+/).filter((p) => p.length >= 4 && !/^(receta|recetas|quiero|como|donde|tengo|puedo|hacer|cocinar|algo|para|sobre|platillo|platillos|comida|cual|cuales|dame|busca|buscar)$/.test(p));
      lista = palabras.length
        ? recetas.filter((r) => palabras.some((p) => sinAcentos(`${r.nombreReceta} ${r.descripcion ?? ''} ${r.region ?? ''} ${r.municipio ?? ''}`).includes(p)))
        : [];
    }
    lista = lista.slice(0, 6);
    const filtros = this.describirFiltros(e, nomEstado);
    if (!lista.length && hayFiltros && (e.estados.length || e.ingredientes.length)) {
      // Relaja la búsqueda: primero sin el ingrediente, luego sin el estado
      const intento = e.estados.length && e.ingredientes.length
        ? { ...e, ingredientes: [], tipo: null, tiempoMax: null, facil: false }
        : { ...e, tipo: null, tiempoMax: null, facil: false };
      const otras = this.filtrar(intento, recetas).slice(0, 6);
      if (otras.length) {
        return {
          intencion: 'recetas', fuente: 'local',
          texto: `No encontré recetas ${filtros}. Te muestro ${otras.length === 6 ? 'algunas' : otras.length} ${this.describirFiltros(intento, nomEstado)} que sí hay en el mapa.`,
          recetas: otras.map((r) => this.tarjeta(r)),
          mapa: { puntos: this.puntos(otras), estados: intento.estados },
          sugerencias: ['Tengo 200 pesos para 4 personas', '¿Qué se recolecta en esta temporada?'],
        };
      }
    }
    if (!lista.length) {
      return {
        intencion: 'ayuda', fuente: 'local', recetas: [], mapa: { puntos: [], estados: e.estados }, sugerencias: SUGERENCIAS_BASE,
        texto: hayFiltros
          ? `No encontré recetas ${filtros}. Prueba con otro estado o ingrediente, o pregúntame dónde se consigue algo.`
          : 'No entendí del todo. Puedes preguntarme, por ejemplo, **"tengo 150 pesos para 3 personas"**, **"¿dónde se recolecta el epazote?"** o **"recetas de Puebla con frijol"**.',
      };
    }
    return {
      intencion: 'recetas', fuente: 'local',
      texto: `Encontré ${lista.length === 6 ? 'estas' : lista.length} recetas${filtros ? ` ${filtros}` : ''}. En el mapa están marcadas sus comunidades de origen.`,
      recetas: lista.map((r) => this.tarjeta(r)),
      mapa: { puntos: this.puntos(lista), estados: e.estados, enlace: e.estados.length === 1 ? `estado.html?id=${e.estados[0]}` : undefined },
      sugerencias: [
        ...this.conOrigen(lista[0]).slice(0, 1).map((i) => `¿Dónde se consigue ${i.nombre.split(' (')[0].toLowerCase()}?`),
        'Tengo 100 pesos para 2 personas', '¿Qué se recolecta en esta temporada?',
      ],
    };
  }

  /* ----- Redacción opcional con Claude ----- */
  private async redactarConIa(dto: PreguntaDto, r: Respuesta): Promise<string | null> {
    const llave = process.env.ANTHROPIC_API_KEY;
    if (!llave) return null;
    const datos = {
      intencion: r.intencion, respuestaBase: r.texto, lista: r.lista, ingredientes: r.ingredientes,
      recetas: r.recetas.map(({ nombreReceta, estado, municipio, costo, porPorcion, tiempoTotal }) => ({ nombreReceta, estado, municipio, costo, porPorcion, tiempoTotal })),
    };
    const sistema = 'Eres el asistente de SIGEPA, una plataforma que preserva el patrimonio gastronómico mexicano con un mapa de recetas. '
      + 'Responde en español de México, cálido y breve (máximo 130 palabras), usando SOLO los datos que te da el sistema; no inventes recetas, precios ni lugares. '
      + 'Los precios son estimaciones aproximadas: dilo. Si hablas de recolectar, recuerda pedir permiso, no arrancar plantas y, con hongos, ir con guía. '
      + 'Puedes usar **negritas** y viñetas con "- ". La interfaz ya muestra las tarjetas de recetas, la lista de compras y el mapa: refiérete a ellos sin repetir todo.';
    const historial = (dto.historial ?? []).slice(-6).map((t) => ({ role: t.rol === 'usuario' ? 'user' : 'assistant', content: t.texto }));
    while (historial.length && historial[0].role !== 'user') historial.shift();
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), 20_000);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', signal: control.signal,
        headers: { 'content-type': 'application/json', 'x-api-key': llave, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: process.env.ASISTENTE_MODELO || 'claude-haiku-5-5', max_tokens: 500, system: sistema,
          messages: [...historial, { role: 'user', content: `Pregunta: ${dto.mensaje}\n\nDatos del sistema (JSON):\n${JSON.stringify(datos)}` }],
        }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
      const texto = json.content?.filter((c) => c.type === 'text').map((c) => c.text).join('').trim();
      return texto || null;
    } finally {
      clearTimeout(reloj);
    }
  }
}

@Controller('api/asistente')
export class AsistenteController {
  constructor(private readonly svc: AsistenteService) {}
  @Post() preguntar(@Body() dto: PreguntaDto) { return this.svc.responder(dto); }
}

@Module({
  imports: [TypeOrmModule.forFeature([Receta, Estado])],
  controllers: [AsistenteController],
  providers: [AsistenteService],
})
export class AsistenteModule {}
