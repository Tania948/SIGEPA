import {
  BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Injectable, Module, NotFoundException,
  Param, ParseIntPipe, Patch, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength,
  ValidateNested,
} from 'class-validator';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { AdminGuard, AuthGuard, CurrentUser, OptionalAuthGuard, PortadorGuard, SesionUsuario } from '../auth/auth';
import { Estado, Receta, TipoUsuario } from '../entities';

/*
 * Formato de las columnas TEXT de la tabla Receta (diccionario de datos):
 *
 *  ingredientes  -> [{ "cantidad": "700", "unidad": "g", "nombre": "pollo en piezas" }, ...]
 *  preparacion   -> {
 *                     "pasos": [{ "titulo": "Prepara los ingredientes", "texto": "Lava los vegetales..." }],
 *                     "porciones": 4, "tiempoTotal": 60, "dificultad": "Intermedia", "tipoPlatillo": "Plato fuerte",
 *                     "region": "Valles Centrales", "localidad": "San Pablo Villa de Mitla",
 *                     "latitud": 16.92, "longitud": -96.36, "consejo": "...", "historia": "...", "pieFoto": "..."
 *                   }
 *
 * Así el esquema queda exactamente como en el diccionario y la receta guarda todo lo que pide el diseño.
 */

export const DIFICULTADES = ['Fácil', 'Intermedia', 'Avanzada'];
export const TIPOS_PLATILLO = [
  'Plato fuerte', 'Sopa o caldo', 'Antojito', 'Tamal', 'Salsa o mole', 'Guarnición', 'Postre', 'Bebida',
];

/* ---------- DTOs ---------- */

export class IngredienteDto {
  @IsOptional() @IsString() @MaxLength(15) cantidad?: string;
  @IsOptional() @IsString() @MaxLength(20) unidad?: string;
  @IsString() @MinLength(1) @MaxLength(80) nombre: string;
}

export class PasoDto {
  @IsOptional() @IsString() @MaxLength(80) titulo?: string;
  @IsString() @MinLength(3) @MaxLength(1200) texto: string;
}

export class RecetaDto {
  @IsString() @MinLength(3) @MaxLength(30, { message: 'El nombre de la receta admite hasta 30 caracteres.' }) nombreReceta: string;
  @IsString() @MinLength(20, { message: 'Cuenta un poco más sobre la receta y su historia.' }) @MaxLength(4000) descripcion: string;
  @IsArray() @ArrayMinSize(1, { message: 'Agrega al menos un ingrediente.' }) @ArrayMaxSize(60)
  @ValidateNested({ each: true }) @Type(() => IngredienteDto) ingredientes: IngredienteDto[];
  @IsArray() @ArrayMinSize(1, { message: 'Agrega al menos un paso.' }) @ArrayMaxSize(40)
  @ValidateNested({ each: true }) @Type(() => PasoDto) pasos: PasoDto[];
  @IsInt({ message: 'Elige el estado de origen.' }) idEstado: number;
  @IsOptional() @IsInt() @Min(1) @Max(200) porciones?: number;
  @IsOptional() @IsInt() @Min(1) @Max(4320) tiempoTotal?: number;
  @IsOptional() @IsIn(DIFICULTADES) dificultad?: string;
  @IsOptional() @IsIn(TIPOS_PLATILLO) tipoPlatillo?: string;
  @IsOptional() @IsString() @MaxLength(60) region?: string;
  @IsOptional() @IsString() @MaxLength(80) localidad?: string;
  @IsOptional() @IsString() @MaxLength(80) municipio?: string;
  /** Clave geoestadística INEGI del municipio (5 dígitos, p. ej. 20068). */
  @IsOptional() @Matches(/^\d{5}$/) cveMun?: string;
  @IsOptional() @IsNumber() @Min(14) @Max(33) latitud?: number;
  @IsOptional() @IsNumber() @Min(-119) @Max(-86) longitud?: number;
  @IsOptional() @IsString() @MaxLength(600) consejo?: string;
  @IsOptional() @IsString() @MaxLength(2000) historia?: string;
  @IsOptional() @IsString() @MaxLength(255) urlImagen?: string;
}

export class ValidacionDto {
  @IsIn(['pendiente', 'validada', 'rechazada']) estadoValidacion: 'pendiente' | 'validada' | 'rechazada';
}

/* ---------- Lectura de las columnas TEXT ---------- */

function leerJson<T>(texto: string | null, porDefecto: T): T {
  if (!texto) return porDefecto;
  try { return JSON.parse(texto) as T; } catch { return porDefecto; }
}

export function serializarReceta(r: Receta) {
  const ingredientes = leerJson<IngredienteDto[]>(r.ingredientes, []);
  const prep = leerJson<Record<string, any>>(r.preparacion, {});
  // Si la preparación se capturó como texto plano (fuera de la API), se muestra como un solo paso.
  const pasos: PasoDto[] = Array.isArray(prep.pasos) ? prep.pasos
    : r.preparacion && !r.preparacion.trim().startsWith('{') ? [{ texto: r.preparacion }] : [];
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
    fechaRegistro: r.fechaRegistro,
    estadoValidacion: r.estadoValidacion,
    urlImagen: r.urlImagen,
    estado: r.estado ? { idEstado: r.estado.idEstado, nomEstado: r.estado.nomEstado } : { idEstado: r.idEstado },
    autor: r.usuario ? { idUs: r.usuario.idUs, nombre: `${r.usuario.nombre} ${r.usuario.apPat}` } : { idUs: r.idUsuario },
  };
}

/** Expresión SQL que lee un campo del JSON guardado en receta.preparacion (MySQL 8 / MariaDB). */
export const campoPrep = (campo: string) =>
  `(CASE WHEN JSON_VALID(r.preparacion) THEN JSON_UNQUOTE(JSON_EXTRACT(r.preparacion, '$.${campo}')) END)`;

/* ---------- Servicio ---------- */

export interface FiltrosReceta {
  q?: string; nombre?: string; ing?: string; ingModo?: string; estado?: string; region?: string; tipo?: string;
  dificultad?: string; tiempo?: string; mun?: string; tiempoMax?: string; conFoto?: string; autor?: string; ids?: string;
  orden?: string; page?: string; limit?: string;
}

const lista = (v?: string) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean);

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
        if (min != null) partes.push(`${tiempo} ${i >= 0 && min > 0 ? '>' : '>='} :tmin${i}`);
        if (max != null) partes.push(`${tiempo} <= :tmax${i}`);
        w.orWhere(partes.join(' AND ') || '1=1', { [`tmin${i}`]: min, [`tmax${i}`]: max });
      })));
    }
    if (f.conFoto === '1' || f.conFoto === 'true') qb.andWhere("r.urlImagen IS NOT NULL AND r.urlImagen <> ''");
    if (f.autor) qb.andWhere('r.idUsuario = :autor', { autor: Number(f.autor) });
    const ids = lista(f.ids).map(Number).filter(Boolean);
    if (f.ids !== undefined) qb.andWhere(ids.length ? 'r.idReceta IN (:...ids)' : '1=0', { ids });
  }

  /** Búsqueda pública: solo recetas validadas. */
  async buscar(f: FiltrosReceta) {
    const limit = Math.min(Math.max(Number(f.limit) || 6, 1), 60);
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

  async detalle(id: number, sesion?: SesionUsuario | null) {
    const r = await this.recetas.findOne({ where: { idReceta: id }, relations: { estado: true, usuario: true } });
    const puedeVer = r && (r.estadoValidacion === 'validada' || r.idUsuario === sesion?.idUs
      || sesion?.tipoUsu === TipoUsuario.ADMINISTRADOR);
    if (!r || !puedeVer) throw new NotFoundException('No encontramos esa receta.');
    return serializarReceta(r);
  }

  private async aEntidad(dto: RecetaDto, r: Partial<Receta>) {
    if (!(await this.estados.exist({ where: { idEstado: dto.idEstado } }))) throw new BadRequestException('Elige un estado válido.');
    const ingredientes = dto.ingredientes
      .map((i) => ({ cantidad: i.cantidad?.trim() || '', unidad: i.unidad?.trim() || '', nombre: i.nombre.trim() }))
      .filter((i) => i.nombre);
    const pasos = dto.pasos.map((p) => ({ titulo: p.titulo?.trim() || undefined, texto: p.texto.trim() })).filter((p) => p.texto);
    if (!ingredientes.length || !pasos.length) throw new BadRequestException('Agrega al menos un ingrediente y un paso.');
    const prep = {
      pasos, porciones: dto.porciones, tiempoTotal: dto.tiempoTotal, dificultad: dto.dificultad,
      tipoPlatillo: dto.tipoPlatillo, region: dto.region?.trim() || undefined, localidad: dto.localidad?.trim() || undefined,
      municipio: dto.municipio?.trim() || undefined, cveMun: dto.cveMun || undefined,
      latitud: dto.latitud, longitud: dto.longitud, consejo: dto.consejo?.trim() || undefined,
      historia: dto.historia?.trim() || undefined,
    };
    Object.assign(r, {
      nombreReceta: dto.nombreReceta.trim(), descripcion: dto.descripcion.trim(), idEstado: dto.idEstado,
      ingredientes: JSON.stringify(ingredientes), preparacion: JSON.stringify(prep),
      urlImagen: dto.urlImagen?.trim() || null,
      // Toda receta nueva o editada vuelve a revisión antes de mostrarse en el mapa.
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

/* ---------- Controlador ---------- */

@Controller('api/recetas')
export class RecetasController {
  constructor(private svc: RecetasService) {}

  @Get() buscar(@Query() f: FiltrosReceta) { return this.svc.buscar(f); }

  @Get('catalogos') catalogos() { return { dificultades: DIFICULTADES, tiposPlatillo: TIPOS_PLATILLO }; }

  @Get('mapa') puntos(@Query('estado') estado?: string) { return this.svc.puntos(Number(estado) || undefined); }

  @Get('regiones') regiones(@Query('estado') estado?: string) { return this.svc.regiones(Number(estado) || undefined); }

  @Get('pendientes') @UseGuards(AdminGuard) pendientes() { return this.svc.pendientes(); }

  @Get(':id') @UseGuards(OptionalAuthGuard)
  detalle(@Param('id', ParseIntPipe) id: number, @CurrentUser() s: SesionUsuario | null) { return this.svc.detalle(id, s); }

  @Post() @UseGuards(PortadorGuard)
  crear(@Body() dto: RecetaDto, @CurrentUser() s: SesionUsuario) { return this.svc.crear(dto, s); }

  @Put(':id') @UseGuards(PortadorGuard)
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: RecetaDto, @CurrentUser() s: SesionUsuario) {
    return this.svc.actualizar(id, dto, s);
  }

  @Delete(':id') @UseGuards(AuthGuard)
  eliminar(@Param('id', ParseIntPipe) id: number, @CurrentUser() s: SesionUsuario) { return this.svc.eliminar(id, s); }

  @Patch(':id/validacion') @UseGuards(AdminGuard)
  validar(@Param('id', ParseIntPipe) id: number, @Body() dto: ValidacionDto) { return this.svc.validar(id, dto.estadoValidacion); }
}

@Module({
  imports: [TypeOrmModule.forFeature([Receta, Estado])],
  controllers: [RecetasController],
  providers: [RecetasService],
  exports: [RecetasService],
})
export class RecetasModule {}
