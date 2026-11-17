import {
  BadRequestException, Body, CanActivate, ConflictException, Controller, createParamDecorator, ExecutionContext,
  ForbiddenException, Get, HttpCode, Injectable, Module, Param, Post, UnauthorizedException, UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { TipoUsuario, Usuario } from '../entities';

export interface SesionUsuario { idUs: number; tipoUsu: TipoUsuario; nombre: string }

/* ---------- Guardias y decorador ---------- */

function leerToken(req: any, jwt: JwtService): SesionUsuario | null {
  const h: string | undefined = req.headers?.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  try { return jwt.verify<SesionUsuario>(h.slice(7)); } catch { return null; }
}

/** Exige sesión iniciada. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    req.user = leerToken(req, this.jwt);
    if (!req.user) throw new UnauthorizedException('Inicia sesión para continuar.');
    return true;
  }
}

/** Lee la sesión si existe, pero no la exige (para marcar favoritos en vistas públicas). */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    req.user = leerToken(req, this.jwt);
    return true;
  }
}

/** Solo administradores (tipoUsu = 1): validan recetas y moderan comentarios. */
@Injectable()
export class AdminGuard extends AuthGuard {
  canActivate(ctx: ExecutionContext) {
    super.canActivate(ctx);
    if (ctx.switchToHttp().getRequest().user.tipoUsu !== TipoUsuario.ADMINISTRADOR)
      throw new ForbiddenException('Solo un administrador puede hacer esto.');
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): SesionUsuario | null => ctx.switchToHttp().getRequest().user ?? null,
);

/* ---------- DTOs ---------- */

export class RegistroDto {
  @IsString() @MinLength(2) @MaxLength(60) nombreCompleto: string;
  @IsEmail({}, { message: 'Escribe un correo válido.' }) @MaxLength(40) email: string;
  @IsString() @MinLength(8, { message: 'La contraseña necesita al menos 8 caracteres.' })
  @Matches(/^(?=.*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ])(?=.*\d)/, { message: 'La contraseña necesita al menos una letra y un número.' })
  contrasenia: string;
  @IsOptional() @IsString() @MaxLength(40) usuario?: string;
}

export class RestablecerDto {
  @IsString() token: string;
  @IsString() @MinLength(8, { message: 'La contraseña necesita al menos 8 caracteres.' })
  @Matches(/^(?=.*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ])(?=.*\d)/, { message: 'La contraseña necesita al menos una letra y un número.' })
  contrasenia: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Escribe un correo válido.' }) email: string;
  @IsString() contrasenia: string;
  @IsOptional() @IsBoolean() recordar?: boolean;
}

/* ---------- Servicio y controlador ---------- */

@Injectable()
export class AuthService {
  constructor(@InjectRepository(Usuario) private usuarios: Repository<Usuario>, private jwt: JwtService) {}

  private emitir(u: Usuario, recordar = false) {
    const payload: SesionUsuario = { idUs: u.idUs, tipoUsu: u.tipoUsu, nombre: u.nombre };
    return {
      token: this.jwt.sign(payload, { expiresIn: recordar ? '30d' : '1d' }),
      usuario: { idUs: u.idUs, nombre: u.nombre, apPat: u.apPat, apMat: u.apMat, usuario: u.usuario, tipoUsu: u.tipoUsu },
    };
  }

  /** Divide "Ana López Pérez" en nombre / apellido paterno / materno respetando VARCHAR(20). */
  private separarNombre(completo: string) {
    const partes = completo.trim().split(/\s+/);
    if (partes.length < 2) throw new BadRequestException('Escribe tu nombre y al menos un apellido.');
    const apMat = partes.length >= 3 ? partes.pop()! : null;
    const apPat = partes.pop()!;
    return { nombre: partes.join(' ').slice(0, 20), apPat: apPat.slice(0, 20), apMat: apMat?.slice(0, 20) ?? null };
  }

  async registrar(dto: RegistroDto) {
    const email = dto.email.toLowerCase();
    if (await this.usuarios.exist({ where: { email } })) throw new ConflictException('Ese correo ya tiene una cuenta.');
    let usuario = (dto.usuario || email.split('@')[0]).replace(/[^a-z0-9._-]/gi, '').slice(0, 34) || 'usuario';
    if (await this.usuarios.exist({ where: { usuario } })) usuario = `${usuario}${Date.now() % 100000}`;
    const u = this.usuarios.create({
      ...this.separarNombre(dto.nombreCompleto), email, usuario,
      contrasenia: await bcrypt.hash(dto.contrasenia, 10), tipoUsu: TipoUsuario.REGULAR,
    });
    return this.emitir(await this.usuarios.save(u));
  }

  /**
   * Recuperación sin columnas extra en la BD: el enlace lleva un JWT de 30 min firmado con
   * JWT_SECRET + el hash actual de la contraseña, así deja de servir en cuanto se cambia.
   */
  private secretoReset(hash: string) { return `${process.env.JWT_SECRET || 'sigepa-dev'}:${hash.slice(-16)}`; }

  async solicitarRecuperacion(email: string) {
    const u = await this.usuarios.createQueryBuilder('u').addSelect('u.contrasenia')
      .where('u.email = :email', { email: (email || '').toLowerCase() }).getOne();
    if (u) {
      const token = this.jwt.sign({ idUs: u.idUs, fin: 'reset' }, { secret: this.secretoReset(u.contrasenia), expiresIn: '30m' });
      // Aquí se enviaría el correo. En el prototipo el enlace se muestra en la consola del servidor.
      console.log(`[SIGEPA] Enlace para restablecer la contraseña de ${u.email}: /restablecer.html?token=${token}`);
    }
    return { mensaje: 'Si el correo está registrado, recibirás las instrucciones. Revisa también tu carpeta de correo no deseado.' };
  }

  private async usuarioDeToken(token: string) {
    const datos = this.jwt.decode(token) as { idUs?: number; fin?: string } | null;
    const u = datos?.idUs && datos.fin === 'reset' ? await this.usuarios.createQueryBuilder('u').addSelect('u.contrasenia')
      .where('u.idUs = :id', { id: datos.idUs }).getOne() : null;
    try {
      if (!u) throw new Error();
      this.jwt.verify(token, { secret: this.secretoReset(u.contrasenia) });
      return u;
    } catch {
      throw new BadRequestException('El enlace ya no es válido. Solicita uno nuevo.');
    }
  }

  async verToken(token: string) { return { email: (await this.usuarioDeToken(token)).email }; }

  async restablecer(dto: RestablecerDto) {
    const u = await this.usuarioDeToken(dto.token);
    if (await bcrypt.compare(dto.contrasenia, u.contrasenia)) throw new BadRequestException('Elige una contraseña distinta a la anterior.');
    await this.usuarios.update({ idUs: u.idUs }, { contrasenia: await bcrypt.hash(dto.contrasenia, 10) });
    return { mensaje: 'Listo. Ya puedes iniciar sesión con tu nueva contraseña.' };
  }

  async login(dto: LoginDto) {
    const u = await this.usuarios.createQueryBuilder('u').addSelect('u.contrasenia')
      .where('u.email = :email', { email: dto.email.toLowerCase() }).getOne();
    if (!u || !(await bcrypt.compare(dto.contrasenia, u.contrasenia)))
      throw new UnauthorizedException('El correo o la contraseña no coinciden.');
    return this.emitir(u, dto.recordar);
  }
}

@Controller('api/auth')
export class AuthController {
  constructor(private auth: AuthService, @InjectRepository(Usuario) private usuarios: Repository<Usuario>) {}

  @Post('registro') registro(@Body() dto: RegistroDto) { return this.auth.registrar(dto); }

  @Post('login') @HttpCode(200) login(@Body() dto: LoginDto) { return this.auth.login(dto); }

  @Get('yo') @UseGuards(AuthGuard)
  yo(@CurrentUser() s: SesionUsuario) { return this.usuarios.findOneByOrFail({ idUs: s.idUs }); }

  @Post('recuperar') @HttpCode(200)
  recuperar(@Body('email') email: string) {
    if (!email) throw new BadRequestException('Escribe tu correo.');
    return this.auth.solicitarRecuperacion(email);
  }

  @Get('restablecer/:token') verToken(@Param('token') token: string) { return this.auth.verToken(token); }

  @Post('restablecer') @HttpCode(200) restablecer(@Body() dto: RestablecerDto) { return this.auth.restablecer(dto); }
}

@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
