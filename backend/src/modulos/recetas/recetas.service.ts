import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, EntityManager, In, Repository, SelectQueryBuilder } from 'typeorm';
import { SesionUsuario } from '../../common/seguridad';
import { lista } from '../../common/utils/json';
import {
  Ingrediente, Lengua, Municipio, Paso, Receta, RecetaIngrediente, Region, TipoUsuario,
} from '../../database/entidades';
import { costoReceta } from '../../dominio/ingredientes/costos';
import { FiltrosReceta, RecetaDto, ValidacionDto } from './receta.dto';
import { serializarReceta, textoACantidad } from './receta.formato';

/** Subconsulta: la receta r tiene un ingrediente cuyo nombre contiene :param. */
const tieneIngrediente = (param: string) =>
  `EXISTS (SELECT 1 FROM receta_ingrediente ri JOIN ingrediente i ON i.idIngrediente = ri.idIngrediente
           WHERE ri.idReceta = r.idReceta AND LOWER(i.nomIngrediente) LIKE :${param})`;

const limpiar = (v?: string | null) => v?.trim().replace(/\s+/g, ' ') || null;

@Injectable()
export class RecetasService {
  constructor(
    @InjectRepository(Receta) private recetas: Repository<Receta>,
    @InjectRepository(Municipio) private municipios: Repository<Municipio>,
    @InjectRepository(Region) private regionesRepo: Repository<Region>,
    @InjectRepository(Lengua) private lenguas: Repository<Lengua>,
  ) {}

  /* ------------------------------------------------------------------ */
  /* Lectura                                                            */
  /* ------------------------------------------------------------------ */

  /** Receta con sus relaciones muchos-a-uno (ubicación, catálogos y autor). */
  private consulta() {
    return this.recetas.createQueryBuilder('r')
      .innerJoinAndSelect('r.municipio', 'm')
      .innerJoinAndSelect('m.estado', 'e')
      .leftJoinAndSelect('r.region', 'g')
      .leftJoinAndSelect('r.lengua', 'l')
      .leftJoinAndSelect('r.usuario', 'u');
  }

  /** Carga ingredientes y pasos de varias recetas con dos consultas (en lugar de una por receta). */
  private async completar(recetas: Receta[]) {
    const ids = recetas.map((r) => r.idReceta);
    if (!ids.length) return recetas;
    const em = this.recetas.manager;
    const [ings, pasos] = await Promise.all([
      em.find(RecetaIngrediente, { where: { idReceta: In(ids) }, relations: { ingrediente: true }, order: { orden: 'ASC' } }),
      em.find(Paso, { where: { idReceta: In(ids) }, order: { numPaso: 'ASC' } }),
    ]);
    for (const r of recetas) {
      r.ingredientes = ings.filter((i) => i.idReceta === r.idReceta);
      r.pasos = pasos.filter((p) => p.idReceta === r.idReceta);
    }
    return recetas;
  }

  private aplicarFiltros(qb: SelectQueryBuilder<Receta>, f: FiltrosReceta) {
    const like = (t: string) => `%${t.toLowerCase()}%`;
    lista(f.q?.replace(/\s+/g, ',')).slice(0, 6).forEach((t, i) => qb.andWhere(new Brackets((w) => {
      w.where(`LOWER(r.nombreReceta) LIKE :q${i}`).orWhere(`LOWER(r.descripcion) LIKE :q${i}`)
        .orWhere(`LOWER(e.nomEstado) LIKE :q${i}`).orWhere(`LOWER(m.nomMunicipio) LIKE :q${i}`)
        .orWhere(tieneIngrediente(`q${i}`));
    }), { [`q${i}`]: like(t) }));

    if (f.nombre?.trim()) qb.andWhere('LOWER(r.nombreReceta) LIKE :nombre', { nombre: like(f.nombre.trim()) });

    const ings = lista(f.ing).slice(0, 10);
    if (ings.length) {
      const todos = f.ingModo !== 'alguno';
      qb.andWhere(new Brackets((w) => ings.forEach((t, i) => {
        const cond = tieneIngrediente(`ing${i}`);
        if (i === 0) w.where(cond, { [`ing${i}`]: like(t) });
        else if (todos) w.andWhere(cond, { [`ing${i}`]: like(t) });
        else w.orWhere(cond, { [`ing${i}`]: like(t) });
      })));
    }

    const estados = lista(f.estado).map(Number).filter(Boolean);
    if (estados.length) qb.andWhere('m.idEstado IN (:...estados)', { estados });
    if (f.region) qb.andWhere('g.nomRegion = :region', { region: f.region });
    if (f.tipo) qb.andWhere('r.tipoPlatillo = :tipo', { tipo: f.tipo });
    if (f.mun) qb.andWhere('r.cveMun = :mun', { mun: f.mun });
    const dif = lista(f.dificultad);
    if (dif.length) qb.andWhere('r.dificultad IN (:...dif)', { dif });

    if (f.tiempoMax) qb.andWhere('r.tiempoTotal <= :tmax', { tmax: Number(f.tiempoMax) });
    const rangos = lista(f.tiempo).map((r) => r.split('-').map((n) => (n === '' ? null : Number(n))));
    if (rangos.length) {
      qb.andWhere(new Brackets((w) => rangos.forEach(([min, max], i) => {
        const partes: string[] = [];
        if (min != null) partes.push(`r.tiempoTotal ${min > 0 ? '>' : '>='} :tmin${i}`);
        if (max != null) partes.push(`r.tiempoTotal <= :tmax${i}`);
        w.orWhere(partes.join(' AND ') || '1=1', { [`tmin${i}`]: min, [`tmax${i}`]: max });
      })));
    }
    if (f.conFoto === '1' || f.conFoto === 'true') qb.andWhere("r.urlImagen IS NOT NULL AND r.urlImagen <> ''");
    if (f.autor) qb.andWhere('r.idUsuario = :autor', { autor: Number(f.autor) });
    const ids = lista(f.ids).map(Number).filter(Boolean);
    if (f.ids !== undefined) qb.andWhere(ids.length ? 'r.idReceta IN (:...ids)' : '1=0', { ids });
  }

  /** Búsqueda pública: solo recetas validadas, paginadas. */
  async buscar(f: FiltrosReceta) {
    const limit = Math.min(Math.max(Number(f.limit) || 6, 1), 100);
    const page = Math.max(Number(f.page) || 1, 1);
    const qb = this.consulta().where('r.estadoValidacion = :v', { v: 'validada' });
    this.aplicarFiltros(qb, f);

    if (f.orden === 'tiempo') qb.orderBy('r.tiempoTotal', 'ASC');
    else if (f.orden === 'nombre') qb.orderBy('r.nombreReceta', 'ASC');
    else if (f.orden === 'antiguas') qb.orderBy('r.fechaRegistro', 'ASC');
    else qb.orderBy('r.fechaRegistro', 'DESC');
    qb.addOrderBy('r.idReceta', 'ASC').skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    await this.completar(items);
    return { total, page, limit, paginas: Math.max(1, Math.ceil(total / limit)), items: items.map(serializarReceta) };
  }

  /** Todas las recetas validadas (para el asistente, temporadas y datos abiertos). */
  async validadas() {
    const filas = await this.consulta().where("r.estadoValidacion = 'validada'").orderBy('r.idReceta').getMany();
    return (await this.completar(filas)).map(serializarReceta);
  }

  async detalle(id: number, sesion?: SesionUsuario | null) {
    const r = await this.consulta().where('r.idReceta = :id', { id }).getOne();
    const puedeVer = r && (r.estadoValidacion === 'validada' || r.idUsuario === sesion?.idUs
      || sesion?.tipoUsu === TipoUsuario.ADMINISTRADOR);
    if (!r || !puedeVer) throw new NotFoundException('No encontramos esa receta.');
    await this.completar([r]);
    return serializarReceta(r);
  }

  /** Costo estimado de la receta para cierto número de personas (precios de referencia). */
  async costo(id: number, personas?: number) {
    const r = await this.detalle(id);
    return costoReceta(r.ingredientes, r.porciones, personas && personas > 0 && personas <= 200 ? personas : undefined);
  }

  async pendientes() {
    const items = await this.consulta().where("r.estadoValidacion = 'pendiente'").orderBy('r.fechaRegistro', 'ASC').getMany();
    return (await this.completar(items)).map(serializarReceta);
  }

  async propias(idUs: number) {
    const items = await this.consulta().where('r.idUsuario = :idUs', { idUs }).orderBy('r.fechaRegistro', 'DESC').getMany();
    return (await this.completar(items)).map(serializarReceta);
  }

  /** Puntos para el mapa: recetas validadas con coordenadas (solo los campos que el mapa necesita). */
  async puntos(idEstado?: number) {
    const qb = this.consulta().where("r.estadoValidacion = 'validada'");
    if (idEstado) qb.andWhere('m.idEstado = :idEstado', { idEstado });
    return (await qb.getMany()).map(serializarReceta).map((r) => ({
      idReceta: r.idReceta, nombreReceta: r.nombreReceta, latitud: r.latitud, longitud: r.longitud,
      municipio: r.municipio, cveMun: r.cveMun, localidad: r.localidad, urlImagen: r.urlImagen,
      estado: r.estado, tipoPlatillo: r.tipoPlatillo,
    }));
  }

  /**
   * Regiones del catálogo con su número de recetas validadas.
   * Con estado: todas las regiones de ese estado. Sin estado: las que tienen recetas.
   */
  async regiones(idEstado?: number) {
    const qb = this.regionesRepo.createQueryBuilder('g')
      .leftJoin(Receta, 'r', "r.idRegion = g.idRegion AND r.estadoValidacion = 'validada'")
      .select('g.nomRegion', 'region').addSelect('COUNT(r.idReceta)', 'total')
      .groupBy('g.nomRegion').orderBy('total', 'DESC').addOrderBy('g.nomRegion', 'ASC');
    if (idEstado) qb.where('g.idEstado = :idEstado', { idEstado });
    else qb.having('COUNT(r.idReceta) > 0');
    return (await qb.getRawMany()).map((x) => ({ region: x.region as string, total: Number(x.total) }));
  }

  /** Lenguas del catálogo (para el formulario de publicación). */
  async catalogoLenguas() {
    return (await this.lenguas.find({ order: { nomLengua: 'ASC' } })).map((l) => l.nomLengua);
  }

  /* ------------------------------------------------------------------ */
  /* Escritura (en transacción: receta + ingredientes + pasos)          */
  /* ------------------------------------------------------------------ */

  /** Busca un renglón de catálogo por nombre y lo crea si no existe. */
  private async catalogo<T extends object>(em: EntityManager, entidad: new () => T, donde: Partial<T>): Promise<T> {
    const repo = em.getRepository(entidad);
    const existente = await repo.findOneBy(donde as never);
    if (existente) return existente;
    try {
      return await repo.save(repo.create(donde as never) as T);
    } catch {
      // Otra petición lo creó al mismo tiempo (UNIQUE): se vuelve a leer.
      return (await repo.findOneBy(donde as never)) as T;
    }
  }

  private async guardar(dto: RecetaDto, r: Receta, em: EntityManager) {
    // Ubicación: el municipio debe existir y pertenecer al estado elegido.
    const municipio = await em.findOneBy(Municipio, { cveMun: dto.cveMun });
    if (!municipio || municipio.idEstado !== dto.idEstado) {
      throw new BadRequestException('Elige un municipio válido del estado seleccionado.');
    }

    // Ingredientes: "chiles guajillo, sin semillas" -> ingrediente "chiles guajillo" + nota "sin semillas".
    const ingredientes = dto.ingredientes.map((i) => {
      const [nombre, ...resto] = (limpiar(i.nombre) ?? '').split(',');
      const cantidad = textoACantidad(i.cantidad);
      if (cantidad === undefined) throw new BadRequestException(`No entendemos la cantidad "${i.cantidad}" de ${nombre}.`);
      const unidad = limpiar(i.unidad);
      return { nombre: nombre.trim(), nota: limpiar(resto.join(',')), cantidad, unidad: unidad === '—' ? null : unidad };
    }).filter((i) => i.nombre);
    const pasos = dto.pasos.map((p) => ({ titulo: limpiar(p.titulo), texto: p.texto.trim() })).filter((p) => p.texto);
    if (!ingredientes.length || !pasos.length) throw new BadRequestException('Agrega al menos un ingrediente y un paso.');
    const repetido = ingredientes.find((x, i) => ingredientes.findIndex((y) => y.nombre.toLowerCase() === x.nombre.toLowerCase()) !== i);
    if (repetido) throw new BadRequestException(`El ingrediente "${repetido.nombre}" está repetido.`);

    const region = limpiar(dto.region);
    const lengua = limpiar(dto.lengua);
    Object.assign(r, {
      cveMun: municipio.cveMun,
      idRegion: region ? (await this.catalogo(em, Region, { idEstado: municipio.idEstado, nomRegion: region })).idRegion : null,
      idLengua: lengua ? (await this.catalogo(em, Lengua, { nomLengua: lengua })).idLengua : null,
      nombreReceta: dto.nombreReceta.trim(),
      nombreLengua: limpiar(dto.nombreLengua),
      descripcion: dto.descripcion.trim(),
      porciones: dto.porciones ?? null,
      tiempoTotal: dto.tiempoTotal ?? null,
      dificultad: dto.dificultad ?? null,
      tipoPlatillo: dto.tipoPlatillo ?? null,
      localidad: limpiar(dto.localidad),
      latitud: dto.latitud ?? null,
      longitud: dto.longitud ?? null,
      historia: limpiar(dto.historia),
      consejo: limpiar(dto.consejo),
      urlImagen: dto.urlImagen?.trim() || null,
      licencia: dto.licencia || 'saber-comunitario',
      consentimiento: dto.consentimiento === true,
      // Toda receta nueva o editada vuelve a revisión del moderador antes de mostrarse en el mapa.
      estadoValidacion: 'pendiente',
    });
    if ((r.latitud === null) !== (r.longitud === null)) throw new BadRequestException('Marca el punto completo en el mapa.');
    const guardada = await em.save(Receta, r);

    // Hijos: se reemplazan completos (la receta es dueña de sus ingredientes y pasos).
    await em.delete(RecetaIngrediente, { idReceta: guardada.idReceta });
    await em.delete(Paso, { idReceta: guardada.idReceta });
    let orden = 0;
    for (const i of ingredientes) {
      const ing = await this.catalogo(em, Ingrediente, { nomIngrediente: i.nombre });
      await em.insert(RecetaIngrediente, {
        idReceta: guardada.idReceta, idIngrediente: ing.idIngrediente, orden: ++orden,
        cantidad: i.cantidad === null ? null : String(i.cantidad), unidad: i.unidad, nota: i.nota,
      });
    }
    await em.insert(Paso, pasos.map((p, n) => ({ idReceta: guardada.idReceta, numPaso: n + 1, titulo: p.titulo, texto: p.texto })));
    return guardada.idReceta;
  }

  async crear(dto: RecetaDto, s: SesionUsuario) {
    const id = await this.recetas.manager.transaction((em) => this.guardar(dto, em.create(Receta, { idUsuario: s.idUs }), em));
    return this.detalle(id, s);
  }

  private async propia(id: number, s: SesionUsuario) {
    const r = await this.recetas.findOneBy({ idReceta: id });
    if (!r) throw new NotFoundException('No encontramos esa receta.');
    if (r.idUsuario !== s.idUs && s.tipoUsu !== TipoUsuario.ADMINISTRADOR) throw new ForbiddenException('Esta receta no es tuya.');
    return r;
  }

  async actualizar(id: number, dto: RecetaDto, s: SesionUsuario) {
    const r = await this.propia(id, s);
    await this.recetas.manager.transaction((em) => this.guardar(dto, r, em));
    return this.detalle(id, s);
  }

  /** Borra la receta; sus ingredientes, pasos, comentarios y favoritos se van con ella (ON DELETE CASCADE). */
  async eliminar(id: number, s: SesionUsuario) {
    await this.recetas.delete({ idReceta: (await this.propia(id, s)).idReceta });
    return { eliminada: true };
  }

  async validar(id: number, estadoValidacion: ValidacionDto['estadoValidacion']) {
    const r = await this.recetas.findOneBy({ idReceta: id });
    if (!r) throw new NotFoundException('No encontramos esa receta.');
    if (estadoValidacion === 'validada' && !r.consentimiento) {
      throw new BadRequestException('La receta no tiene el consentimiento de su comunidad; no se puede validar.');
    }
    await this.recetas.update({ idReceta: id }, { estadoValidacion });
    return { idReceta: id, estadoValidacion };
  }
}
