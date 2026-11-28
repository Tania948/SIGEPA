// Asistente de SIGEPA: responde preguntas sobre recetas, presupuesto y origen de ingredientes
// y devuelve qué mostrar en el mapa (pines de recetas y estados resaltados).
// Funciona sin servicios externos: entiende la pregunta con reglas (motor/interpretar.ts) y calcula con los
// datos de la base y el catálogo de ingredientes (dominio/ingredientes).
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Estado } from '../../database/entidades';
import { INGREDIENTES, Ingrediente, identificar, sinAcentos } from '../../dominio/ingredientes/catalogo';
import { Costo, LineaCosto, costoReceta } from '../../dominio/ingredientes/costos';
import { MESES, enTemporada, mesActual } from '../../dominio/ingredientes/temporada';
import { RecetaPublica } from '../recetas/receta.formato';
import { RecetasService } from '../recetas/recetas.service';
import { PreguntaDto } from './asistente.dto';
import { Entendido, entender, mismoIngrediente } from './motor/interpretar';

type RecetaS = RecetaPublica;
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
}

const SUGERENCIAS_BASE = [
  'Tengo 200 pesos, ¿qué puedo cocinar para 4 personas?',
  '¿Dónde se recolecta la hierba santa?',
  '¿Qué se recolecta en Oaxaca en esta temporada?',
  'Recetas rápidas de Yucatán',
];
const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-MX')}`;

@Injectable()
export class AsistenteService {
  /** Las recetas se leen una vez cada 30 s: el asistente responde rápido sin consultar la base en cada mensaje. */
  private cache: { hasta: number; recetas: RecetaS[]; estados: Estado[] } | null = null;

  constructor(
    private readonly recetasSvc: RecetasService,
    @InjectRepository(Estado) private readonly estadosRepo: Repository<Estado>,
  ) {}

  private async datos() {
    if (this.cache && this.cache.hasta > Date.now()) return this.cache;
    const [recetas, estados] = await Promise.all([this.recetasSvc.validadas(), this.estadosRepo.find()]);
    this.cache = { hasta: Date.now() + 30_000, recetas, estados };
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
      intencion: 'saludo', recetas: [], mapa: { puntos: [], estados: [] }, sugerencias: SUGERENCIAS_BASE,
      texto: 'Hola, soy el asistente de SIGEPA. Puedo ayudarte a:\n'
        + '- **Cocinar con tu presupuesto:** dime cuánto tienes y para cuántas personas.\n'
        + '- **Saber de dónde viene un ingrediente** y dónde se recolecta o se consigue, con el mapa.\n'
        + '- **Encontrar recetas** por estado, ingrediente o tiempo.\n'
        + 'Los precios son estimaciones de referencia y cambian según la región y la temporada.',
    };
  }

  private presupuesto(e: Entendido, recetas: RecetaS[], nomEstado: (id: number) => string): Respuesta {
    const monto = e.presupuesto!;
    const candidatas = this.filtrar(e, recetas).map((r) => ({ r, c: costoReceta(r.ingredientes, r.porciones, e.personas ?? undefined) }));
    const alcanzan = candidatas.filter((x) => x.c.total <= monto).sort((a, b) => b.c.total - a.c.total);
    const para = e.personas ? ` para ${e.personas} personas` : '';
    const filtros = this.describirFiltros(e, nomEstado);

    if (!alcanzan.length) {
      const baratas = candidatas.sort((a, b) => a.c.total - b.c.total).slice(0, 4);
      return {
        intencion: 'presupuesto',
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
      intencion: 'presupuesto',
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
        intencion: 'origen',
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
      intencion: 'origen',
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
      intencion: 'precio',
      texto: fichas.map((i) => `- **${i.nombre}**: ${this.fichaIngrediente(i, nomEstado).precio}`).join('\n')
        + '\nSon precios de referencia aproximados (Profeco y SNIIM, 2026). Varían por región, temporada y lugar de compra.',
      ingredientes: fichas.map((i) => this.fichaIngrediente(i, nomEstado)),
      recetas: usan.map((r) => this.tarjeta(r, costoReceta(r.ingredientes, r.porciones))),
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
          intencion: 'recetas',
          texto: `No encontré recetas ${filtros}. Te muestro ${otras.length === 6 ? 'algunas' : otras.length} ${this.describirFiltros(intento, nomEstado)} que sí hay en el mapa.`,
          recetas: otras.map((r) => this.tarjeta(r)),
          mapa: { puntos: this.puntos(otras), estados: intento.estados },
          sugerencias: ['Tengo 200 pesos para 4 personas', '¿Qué se recolecta en esta temporada?'],
        };
      }
    }
    if (!lista.length) {
      return {
        intencion: 'ayuda', recetas: [], mapa: { puntos: [], estados: e.estados }, sugerencias: SUGERENCIAS_BASE,
        texto: hayFiltros
          ? `No encontré recetas ${filtros}. Prueba con otro estado o ingrediente, o pregúntame dónde se consigue algo.`
          : 'No entendí del todo. Puedes preguntarme, por ejemplo, **"tengo 150 pesos para 3 personas"**, **"¿dónde se recolecta el epazote?"** o **"recetas de Puebla con frijol"**.',
      };
    }
    return {
      intencion: 'recetas',
      texto: `Encontré ${lista.length === 6 ? 'estas' : lista.length} recetas${filtros ? ` ${filtros}` : ''}. En el mapa están marcadas sus comunidades de origen.`,
      recetas: lista.map((r) => this.tarjeta(r)),
      mapa: { puntos: this.puntos(lista), estados: e.estados, enlace: e.estados.length === 1 ? `estado.html?id=${e.estados[0]}` : undefined },
      sugerencias: [
        ...this.conOrigen(lista[0]).slice(0, 1).map((i) => `¿Dónde se consigue ${i.nombre.split(' (')[0].toLowerCase()}?`),
        'Tengo 100 pesos para 2 personas', '¿Qué se recolecta en esta temporada?',
      ],
    };
  }
}
