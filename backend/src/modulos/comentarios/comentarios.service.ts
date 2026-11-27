import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SesionUsuario } from '../../common/seguridad';
import { Comentario, Receta, TipoUsuario } from '../../database/entidades';
import { ModeracionDto } from './comentario.dto';

@Injectable()
export class ComentariosService {
  constructor(
    @InjectRepository(Comentario) private comentarios: Repository<Comentario>,
    @InjectRepository(Receta) private recetas: Repository<Receta>,
  ) {}

  async deReceta(idReceta: number) {
    const items = await this.comentarios.find({
      where: { idReceta, estadoComentario: 'publicado' }, relations: { usuario: true }, order: { fechaComentario: 'DESC' },
    });
    return items.map((c) => ({
      idComentario: c.idComentario, comentario: c.comentario, fechaComentario: c.fechaComentario,
      autor: { idUs: c.usuario.idUs, nombre: `${c.usuario.nombre} ${c.usuario.apPat}` },
    }));
  }

  async crear(idReceta: number, texto: string, s: SesionUsuario) {
    if (!(await this.recetas.exist({ where: { idReceta, estadoValidacion: 'validada' } })))
      throw new NotFoundException('No encontramos esa receta.');
    const c = await this.comentarios.save(this.comentarios.create({ idReceta, idUsuario: s.idUs, comentario: texto.trim() }));
    return { idComentario: c.idComentario };
  }

  async moderar(id: number, estado: ModeracionDto['estadoComentario']) {
    const r = await this.comentarios.update({ idComentario: id }, { estadoComentario: estado });
    if (!r.affected) throw new NotFoundException('No encontramos ese comentario.');
    return { idComentario: id, estadoComentario: estado };
  }

  /** La persona autora (o el moderador) retira el comentario: queda como "eliminado". */
  async retirar(id: number, s: SesionUsuario) {
    const c = await this.comentarios.findOneBy({ idComentario: id });
    if (!c) throw new NotFoundException('No encontramos ese comentario.');
    if (c.idUsuario !== s.idUs && s.tipoUsu !== TipoUsuario.ADMINISTRADOR) throw new ForbiddenException();
    c.estadoComentario = 'eliminado';
    await this.comentarios.save(c);
    return { eliminado: true };
  }
}
