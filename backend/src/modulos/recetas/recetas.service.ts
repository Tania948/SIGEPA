import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { SesionUsuario } from '../../common/seguridad';
import { lista } from '../../common/utils/json';
import { Estado, Receta, TipoUsuario } from '../../database/entidades';
import { costoReceta } from '../../dominio/ingredientes/costos';
import { FiltrosReceta, RecetaDto, ValidacionDto } from './receta.dto';
import { campoPrep, serializarReceta } from './receta.formato';

@Injectable()
export class RecetasService {
  constructor(
    @InjectRepository(Receta) private recetas: Repository<Receta>,
    @InjectRepository(Estado) private estados: Repository<Estado>,
  ) {}

  private aplicarFiltros(qb: SelectQueryBuilder<Receta>, f: FiltrosReceta) {
    const like = (t: string) => `%${t.toLowerCase()}%`;
    lista(f.q?.replace(/\s+/g, ',')).slice(0, 6).forEach((t, i) => qb.andWhere(new Brackets((w) => {
      w.where(`LOWER(r.nombreReceta) LIKE :q${i}`).orWhere(`LOWER(r.ingredientes) LIKE :q${i}`)
        .orWhere(`LOWER(r.descripcion) LIKE :q${i}`).orWhere(`LOWER(e.nomEstado) LIKE :q${i}`);
    }), { [`q${i}`]: like(t) }));

    if (f.nombre?.trim()) qb.andWhere('LOWER(r.nombreReceta) LIKE :nombre', { nombre: like(f.nombre.trim()) });

    const ings = lista(f.ing).slice(0, 10);
    if (ings.length) {
      const todos = f.ingModo !== 'alguno';
      qb.andWhere(new Brackets((w) => ings.forEach((t, i) => {
        const cond = `LOWER(r.ingredientes) LIKE :ing${i}`;
        if (i === 0) w.where(cond, { [`ing${i}`]: like(t) });
        else if (todos) w.andWhere(cond, { [`ing${i}`]: like(t) });
        else w.orWhere(cond, { [`ing${i}`]: like(t) });
      })));
    }

    const estados = lista(f.estado).map(Number).filter(Boolean);
    if (estados.length) qb.andWhere('r.idEstado IN (:...estados)', { estados });
    if (f.region) qb.andWhere(`${campoPrep('region')} = :region`, { region: f.region });
    if (f.tipo) qb.andWhere(`${campoPrep('tipoPlatillo')} = :tipo`, { tipo: f.tipo });
    if (f.mun) qb.andWhere(`${campoPrep('cveMun')} = :mun`, { mun: f.mun });
    const dif = lista(f.dificultad);
    if (dif.length) qb.andWhere(`${campoPrep('dificultad')} IN (:...dif)`, { dif });

    const tiempo = `CAST(${campoPrep('tiempoTotal')} AS UNSIGNED)`;
    if (f.tiempoMax) qb.andWhere(`${tiempo} <= :tmax`, { tmax: Number(f.tiempoMax) });
    const rangos = lista(f.tiempo).map((r) => r.split('-').map((n) => (n === '' ? null : Number(n))));
    if (rangos.length) {
      qb.andWhere(new Brackets((w) => rangos.forEach(([min, max], i) => {
        const partes: string[] = [];
        if (min != null) partes.push(`${tiempo} ${min > 0 ? '>' : '>='} :tmin${i}`);
        if (max != null) partes.push(`${tiempo} <= :tmax${i}`);
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
    const qb = this.recetas.createQueryBuilder('r')
      .leftJoinAndSelect('r.estado', 'e').leftJoinAndSelect('r.usuario', 'u')
      .where('r.estadoValidacion = :v', { v: 'validada' });
    this.aplicarFiltros(qb, f);

    if (f.orden === 'tiempo') qb.addSelect(`CAST(${campoPrep('tiempoTotal')} AS UNSIGNED)`, 'tiempo_orden').orderBy('tiempo_orden', 'ASC');
    else if (f.orden === 'nombre') qb.orderBy('r.nombreReceta', 'ASC');
    else if (f.orden === 'antiguas') qb.orderBy('r.fechaRegistro', 'ASC');
    else qb.orderBy('r.fechaRegistro', 'DESC');
    qb.addOrderBy('r.idReceta', 'ASC').skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { total, page, limit, paginas: Math.max(1, Math.ceil(total / limit)), items: items.map(serializarReceta) };
  }

  /** Todas las recetas validadas (para el asistente, temporadas y datos abiertos). */
  async validadas() {
    const filas = await this.recetas.find({ where: { estadoValidacion: 'validada' }, relations: { estado: true, usuario: true } });
    return filas.map(serializarReceta);
  }

  async detalle(id: number, sesion?: SesionUsuario | null) {
    const r = await this.recetas.findOne({ where: { idReceta: id }, relations: { estado: true, usuario: true } });
    const puedeVer = r && (r.estadoValidacion === 'validada' || r.idUsuario === sesion?.idUs
      || sesion?.tipoUsu === TipoUsuario.ADMINISTRADOR);
    if (!r || !puedeVer) throw new NotFoundException('No encontramos esa receta.');
    return serializarReceta(r);
  }

  /** Costo estimado de la receta para cierto número de personas (precios de referencia). */
  async costo(id: number, personas?: number) {
    const r = await this.detalle(id);
    return costoReceta(r.ingredientes, r.porciones, personas && personas > 0 && personas <= 200 ? personas : undefined);
  }

  private async aEntidad(dto: RecetaDto, r: Partial<Receta>) {
    if (!(await this.estados.exist({ where: { idEstado: dto.idEstado } }))) throw new BadRequestException('Elige un estado válido.');
    const ingredientes = dto.ingredientes
      .map((i) => ({ cantidad: i.cantidad?.trim() || '', unidad: i.unidad?.trim() || '', nombre: i.nombre.trim() }))
      .filter((i) => i.nombre);
    const pasos = dto.pasos.map((p) => ({ titulo: p.titulo?.trim() || undefined, texto: p.texto.trim() })).filter((p) => p.texto);
    if (!ingredientes.length || !pasos.length) throw new BadRequestException('Agrega al menos un ingrediente y un paso.');
    const texto = (v?: string) => v?.trim() || undefined;
    const prep = {
      pasos, porciones: dto.porciones, tiempoTotal: dto.tiempoTotal, dificultad: dto.dificultad,
      tipoPlatillo: dto.tipoPlatillo, region: texto(dto.region), localidad: texto(dto.localidad),
      municipio: texto(dto.municipio), cveMun: dto.cveMun || undefined,
      latitud: dto.latitud, longitud: dto.longitud, consejo: texto(dto.consejo), historia: texto(dto.historia),
      nombreLengua: texto(dto.nombreLengua), lengua: texto(dto.lengua),
      licencia: dto.licencia || 'saber-comunitario', consentimiento: true,
    };
    Object.assign(r, {
      nombreReceta: dto.nombreReceta.trim(), descripcion: dto.descripcion.trim(), idEstado: dto.idEstado,
      ingredientes: JSON.stringify(ingredientes), preparacion: JSON.stringify(prep),
      urlImagen: dto.urlImagen?.trim() || null,
      // Toda receta nueva o editada vuelve a revisión del moderador antes de mostrarse en el mapa.
      estadoValidacion: 'pendiente',
    });
    return r;
  }

  async crear(dto: RecetaDto, s: SesionUsuario) {
    const r = await this.aEntidad(dto, this.recetas.create({ idUsuario: s.idUs }));
    const guardada = await this.recetas.save(r as Receta);
    return this.detalle(guardada.idReceta, s);
  }

  private async propia(id: number, s: SesionUsuario) {
    const r = await this.recetas.findOneBy({ idReceta: id });
    if (!r) throw new NotFoundException('No encontramos esa receta.');
    if (r.idUsuario !== s.idUs && s.tipoUsu !== TipoUsuario.ADMINISTRADOR) throw new ForbiddenException('Esta receta no es tuya.');
    return r;
  }

  async actualizar(id: number, dto: RecetaDto, s: SesionUsuario) {
    const r = await this.aEntidad(dto, await this.propia(id, s));
    await this.recetas.save(r as Receta);
    return this.detalle(id, s);
  }

  async eliminar(id: number, s: SesionUsuario) {
    await this.recetas.remove(await this.propia(id, s));
    return { eliminada: true };
  }

  async validar(id: number, estadoValidacion: ValidacionDto['estadoValidacion']) {
    const r = await this.recetas.findOneBy({ idReceta: id });
    if (!r) throw new NotFoundException('No encontramos esa receta.');
    r.estadoValidacion = estadoValidacion;
    await this.recetas.save(r);
    return { idReceta: id, estadoValidacion };
  }

  async pendientes() {
    const items = await this.recetas.find({
      where: { estadoValidacion: 'pendiente' }, relations: { estado: true, usuario: true }, order: { fechaRegistro: 'ASC' },
    });
    return items.map(serializarReceta);
  }

  async propias(idUs: number) {
    const items = await this.recetas.find({
      where: { idUsuario: idUs }, relations: { estado: true, usuario: true }, order: { fechaRegistro: 'DESC' },
    });
    return items.map(serializarReceta);
  }

  /** Puntos para el mapa: recetas validadas con coordenadas (solo los campos que el mapa necesita). */
  async puntos(idEstado?: number) {
    const qb = this.recetas.createQueryBuilder('r').leftJoinAndSelect('r.estado', 'e')
      .where("r.estadoValidacion = 'validada'");
    if (idEstado) qb.andWhere('r.idEstado = :idEstado', { idEstado });
    return (await qb.getMany()).map(serializarReceta).map((r) => ({
      idReceta: r.idReceta, nombreReceta: r.nombreReceta, latitud: r.latitud, longitud: r.longitud,
      municipio: r.municipio, cveMun: r.cveMun, localidad: r.localidad, urlImagen: r.urlImagen,
      estado: r.estado, tipoPlatillo: r.tipoPlatillo,
    }));
  }

  /** Regiones registradas en recetas validadas (opcionalmente de un estado). */
  async regiones(idEstado?: number) {
    const qb = this.recetas.createQueryBuilder('r').select(campoPrep('region'), 'region').addSelect('COUNT(*)', 'total')
      .where("r.estadoValidacion = 'validada'").andWhere(`${campoPrep('region')} IS NOT NULL`)
      .groupBy('region').orderBy('total', 'DESC');
    if (idEstado) qb.andWhere('r.idEstado = :idEstado', { idEstado });
    return (await qb.getRawMany()).map((x) => ({ region: x.region as string, total: Number(x.total) }));
  }
}
