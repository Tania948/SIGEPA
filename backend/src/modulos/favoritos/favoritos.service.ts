import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorito, Receta } from '../../database/entidades';

/** Recetas que cada usuario guarda (tabla asociativa favorito). */
@Injectable()
export class FavoritosService {
  constructor(
    @InjectRepository(Favorito) private favoritos: Repository<Favorito>,
    @InjectRepository(Receta) private recetas: Repository<Receta>,
  ) {}

  /** Del más reciente al más antiguo. */
  async listar(idUs: number) {
    const filas = await this.favoritos.find({ where: { idUs }, order: { fechaFavorito: 'DESC', idReceta: 'DESC' } });
    return filas.map((f) => ({ idReceta: f.idReceta, fechaFavorito: f.fechaFavorito }));
  }

  async agregar(idUs: number, idReceta: number) {
    const receta = await this.recetas.findOneBy({ idReceta });
    if (!receta || (receta.estadoValidacion !== 'validada' && receta.idUsuario !== idUs)) {
      throw new NotFoundException('No encontramos esa receta.');
    }
    // INSERT IGNORE: guardar dos veces la misma receta no es un error (PK idUs + idReceta).
    await this.favoritos.createQueryBuilder().insert().orIgnore().values({ idUs, idReceta }).execute();
    return { idReceta, guardada: true };
  }

  async quitar(idUs: number, idReceta: number) {
    await this.favoritos.delete({ idUs, idReceta });
    return { idReceta, guardada: false };
  }
}
