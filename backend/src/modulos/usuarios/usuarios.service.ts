import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { TipoUsuario, Usuario } from '../../database/entidades';
import { AuthService } from '../auth/auth.service';
import { RecetasService } from '../recetas/recetas.service';
import { PerfilDto } from './usuario.dto';

/** Estado que más aparece en las recetas de una persona (para "Desde Oaxaca"). */
function estadoPrincipal(recetas: { estado: { nomEstado?: string } }[]) {
  const cuenta = new Map<string, number>();
  recetas.forEach((r) => r.estado.nomEstado && cuenta.set(r.estado.nomEstado, (cuenta.get(r.estado.nomEstado) ?? 0) + 1));
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario) private usuarios: Repository<Usuario>,
    private recetas: RecetasService,
    private auth: AuthService,
  ) {}

  /** Un usuario se convierte en portador de saberes para poder publicar recetas. */
  async hacersePortador(idUs: number) {
    const u = await this.usuarios.findOneByOrFail({ idUs });
    if (u.tipoUsu === TipoUsuario.REGULAR) {
      u.tipoUsu = TipoUsuario.PORTADOR;
      await this.usuarios.save(u);
    }
    return this.auth.emitir(u, true);
  }

  misRecetas(idUs: number) { return this.recetas.propias(idUs); }

  async actualizar(idUs: number, dto: PerfilDto) {
    if (dto.email) {
      dto.email = dto.email.toLowerCase();
      if (await this.usuarios.exist({ where: { email: dto.email, idUs: Not(idUs) } }))
        throw new ConflictException('Ese correo ya pertenece a otra cuenta.');
    }
    const cambios: Partial<Usuario> = { ...dto };
    if (dto.apMat !== undefined) cambios.apMat = dto.apMat.trim() || null;
    await this.usuarios.update({ idUs }, cambios);
    return this.usuarios.findOneByOrFail({ idUs });
  }

  /** Perfil público: nombre, rol, recetas validadas y estado de procedencia (no expone el correo). */
  async publico(id: number) {
    const u = await this.usuarios.findOneBy({ idUs: id });
    if (!u) throw new NotFoundException('No encontramos ese perfil.');
    const recetas = await this.recetas.buscar({ autor: String(id), limit: '60' });
    return {
      idUs: u.idUs, nombre: u.nombre, apPat: u.apPat, apMat: u.apMat, tipoUsu: u.tipoUsu,
      totalRecetas: recetas.total, estadoPrincipal: estadoPrincipal(recetas.items),
      regiones: [...new Set(recetas.items.map((r) => r.region).filter(Boolean))],
      recetas: recetas.items,
    };
  }
}
