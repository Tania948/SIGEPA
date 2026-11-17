import {
  BadRequestException, Body, ConflictException, Controller, Delete, ForbiddenException, Get, Module, NotFoundException,
  Param, ParseIntPipe, Patch, Post, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Not, Repository } from 'typeorm';
import { AdminGuard, AuthGuard, AuthModule, AuthService, CurrentUser, PortadorGuard, SesionUsuario } from '../auth/auth';
import { Comentario, Estado, Receta, TipoUsuario, Usuario } from '../entities';
import { RecetasModule, RecetasService, serializarReceta } from '../recetas/recetas';

export const UPLOADS_DIR = join(process.cwd(), 'uploads');

/* =================== Estados =================== */

@Controller('api/estados')
export class EstadosController {
  constructor(@InjectRepository(Estado) private estados: Repository<Estado>, private recetasSvc: RecetasService) {}

  /** Catálogo de estados con el número de recetas validadas (vista del mapa). */
  @Get()
  async listar() {
    const filas = await this.estados.createQueryBuilder('e')
      .leftJoin('e.recetas', 'r', "r.estadoValidacion = 'validada'")
      .select(['e.idEstado AS idEstado', 'e.nomEstado AS nomEstado'])
      .addSelect('COUNT(r.idReceta)', 'totalRecetas')
      .groupBy('e.idEstado').addGroupBy('e.nomEstado').orderBy('e.nomEstado', 'ASC').getRawMany();
    return filas.map((f) => ({ idEstado: Number(f.idEstado), nomEstado: f.nomEstado, totalRecetas: Number(f.totalRecetas) }));
  }

  @Get(':id')
  async detalle(@Param('id', ParseIntPipe) id: number) {
    const e = await this.estados.findOneBy({ idEstado: id });
    if (!e) throw new NotFoundException('No encontramos ese estado.');
    return { ...e, regiones: await this.recetasSvc.regiones(id) };
  }
}

/* =================== Comentarios =================== */

class ComentarioDto { @IsString() @MinLength(2) @MaxLength(1500) comentario: string; }
class ModeracionDto { @IsIn(['publicado', 'oculto', 'eliminado']) estadoComentario: 'publicado' | 'oculto' | 'eliminado'; }

@Controller('api')
export class ComentariosController {
  constructor(
    @InjectRepository(Comentario) private comentarios: Repository<Comentario>,
    @InjectRepository(Receta) private recetas: Repository<Receta>,
  ) {}

  @Get('recetas/:id/comentarios')
  async listar(@Param('id', ParseIntPipe) id: number) {
    const items = await this.comentarios.find({
      where: { idReceta: id, estadoComentario: 'publicado' }, relations: { usuario: true }, order: { fechaComentario: 'DESC' },
    });
    return items.map((c) => ({
      idComentario: c.idComentario, comentario: c.comentario, fechaComentario: c.fechaComentario,
      autor: { idUs: c.usuario.idUs, nombre: `${c.usuario.nombre} ${c.usuario.apPat}` },
    }));
  }

  @Post('recetas/:id/comentarios') @UseGuards(AuthGuard)
  async crear(@Param('id', ParseIntPipe) id: number, @Body() dto: ComentarioDto, @CurrentUser() s: SesionUsuario) {
    if (!(await this.recetas.exist({ where: { idReceta: id, estadoValidacion: 'validada' } })))
      throw new NotFoundException('No encontramos esa receta.');
    const c = await this.comentarios.save(this.comentarios.create({ idReceta: id, idUsuario: s.idUs, comentario: dto.comentario.trim() }));
    return { idComentario: c.idComentario };
  }

  /** Moderación (administrador): publicado, oculto o eliminado. */
  @Patch('comentarios/:id') @UseGuards(AdminGuard)
  async moderar(@Param('id', ParseIntPipe) id: number, @Body() dto: ModeracionDto) {
    const r = await this.comentarios.update({ idComentario: id }, { estadoComentario: dto.estadoComentario });
    if (!r.affected) throw new NotFoundException('No encontramos ese comentario.');
    return { idComentario: id, estadoComentario: dto.estadoComentario };
  }

  /** La persona autora puede retirar su comentario (queda como "eliminado"). */
  @Delete('comentarios/:id') @UseGuards(AuthGuard)
  async eliminar(@Param('id', ParseIntPipe) id: number, @CurrentUser() s: SesionUsuario) {
    const c = await this.comentarios.findOneBy({ idComentario: id });
    if (!c) throw new NotFoundException('No encontramos ese comentario.');
    if (c.idUsuario !== s.idUs && s.tipoUsu !== TipoUsuario.ADMINISTRADOR) throw new ForbiddenException();
    c.estadoComentario = 'eliminado';
    await this.comentarios.save(c);
    return { eliminado: true };
  }
}

/* =================== Usuarios / perfiles =================== */

class PerfilDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(20) nombre?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(20) apPat?: string;
  @IsOptional() @IsString() @MaxLength(20) apMat?: string;
  @IsOptional() @IsEmail({}, { message: 'Escribe un correo válido.' }) @MaxLength(40) email?: string;
}

/** Estado que más aparece en las recetas de una persona (para "Desde Oaxaca"). */
function estadoPrincipal(recetas: { estado: { nomEstado?: string } }[]) {
  const cuenta = new Map<string, number>();
  recetas.forEach((r) => r.estado.nomEstado && cuenta.set(r.estado.nomEstado, (cuenta.get(r.estado.nomEstado) ?? 0) + 1));
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

@Controller('api/usuarios')
export class UsuariosController {
  constructor(
    @InjectRepository(Usuario) private usuarios: Repository<Usuario>,
    @InjectRepository(Receta) private recetas: Repository<Receta>,
    private recetasSvc: RecetasService,
    private auth: AuthService,
  ) {}

  /** Un usuario se registra como portador de saberes para poder publicar recetas. */
  @Post('yo/portador') @UseGuards(AuthGuard)
  async hacersePortador(@CurrentUser() s: SesionUsuario) {
    const u = await this.usuarios.findOneByOrFail({ idUs: s.idUs });
    if (u.tipoUsu === TipoUsuario.REGULAR) {
      u.tipoUsu = TipoUsuario.PORTADOR;
      await this.usuarios.save(u);
    }
    return this.auth.emitir(u, true);
  }

  /** Mis aportes: todas mis recetas, validadas, en revisión o rechazadas. */
  @Get('yo/recetas') @UseGuards(AuthGuard)
  async misRecetas(@CurrentUser() s: SesionUsuario) {
    const items = await this.recetas.find({
      where: { idUsuario: s.idUs }, relations: { estado: true, usuario: true }, order: { fechaRegistro: 'DESC' },
    });
    return items.map(serializarReceta);
  }

  @Patch('yo') @UseGuards(AuthGuard)
  async actualizar(@Body() dto: PerfilDto, @CurrentUser() s: SesionUsuario) {
    if (dto.email) {
      dto.email = dto.email.toLowerCase();
      if (await this.usuarios.exist({ where: { email: dto.email, idUs: Not(s.idUs) } }))
        throw new ConflictException('Ese correo ya pertenece a otra cuenta.');
    }
    if (dto.apMat !== undefined) dto.apMat = dto.apMat.trim() || (null as any);
    await this.usuarios.update({ idUs: s.idUs }, dto);
    return this.usuarios.findOneByOrFail({ idUs: s.idUs });
  }

  /** Perfil público: nombre, recetas validadas y estado de procedencia (no expone el correo). */
  @Get(':id')
  async publico(@Param('id', ParseIntPipe) id: number) {
    const u = await this.usuarios.findOneBy({ idUs: id });
    if (!u) throw new NotFoundException('No encontramos ese perfil.');
    const recetas = await this.recetasSvc.buscar({ autor: String(id), limit: '60' });
    return {
      idUs: u.idUs, nombre: u.nombre, apPat: u.apPat, apMat: u.apMat, tipoUsu: u.tipoUsu,
      totalRecetas: recetas.total, estadoPrincipal: estadoPrincipal(recetas.items),
      regiones: [...new Set(recetas.items.map((r) => r.region).filter(Boolean))],
      recetas: recetas.items,
    };
  }
}

/* =================== Subida de fotografías =================== */

@Controller('api/uploads')
export class UploadsController {
  @Post() @UseGuards(PortadorGuard)
  @UseInterceptors(FileInterceptor('foto', {
    storage: diskStorage({
      destination: UPLOADS_DIR,
      filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${extname(file.originalname).toLowerCase()}`),
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png)$/.test(file.mimetype)),
  }))
  subir(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Sube una imagen JPG o PNG de hasta 10 MB.');
    return { url: `/uploads/${file.filename}` };
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Estado, Comentario, Receta, Usuario]), RecetasModule, AuthModule],
  controllers: [EstadosController, ComentariosController, UsuariosController, UploadsController],
})
export class ComunidadModule {}
