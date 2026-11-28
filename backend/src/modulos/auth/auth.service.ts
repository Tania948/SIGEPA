import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { SesionUsuario } from '../../common/seguridad';
import { TipoUsuario, Usuario } from '../../database/entidades';
import { LoginDto, RegistroDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(@InjectRepository(Usuario) private usuarios: Repository<Usuario>, private jwt: JwtService) {}

  /** Crea el token de sesión y los datos públicos del usuario. */
  emitir(u: Usuario, recordar = false) {
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
      contrasenia: await bcrypt.hash(dto.contrasenia, 10),
      // El moderador no se registra desde la web: su cuenta se crea en la base (ver database/datos.sql).
      tipoUsu: dto.rol === 'portador' ? TipoUsuario.PORTADOR : TipoUsuario.REGULAR,
    });
    return this.emitir(await this.usuarios.save(u));
  }

  async iniciarSesion(dto: LoginDto) {
    const u = await this.usuarios.createQueryBuilder('u').addSelect('u.contrasenia')
      .where('u.email = :email', { email: dto.email.toLowerCase() }).getOne();
    if (!u || !(await bcrypt.compare(dto.contrasenia, u.contrasenia)))
      throw new UnauthorizedException('El correo o la contraseña no coinciden.');
    return this.emitir(u, dto.recordar);
  }

  perfil(idUs: number) { return this.usuarios.findOneByOrFail({ idUs }); }
}
