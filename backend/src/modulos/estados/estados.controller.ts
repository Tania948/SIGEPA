import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Estado } from '../../database/entidades';
import { RecetasService } from '../recetas/recetas.service';

@Controller('api/estados')
export class EstadosController {
  constructor(@InjectRepository(Estado) private estados: Repository<Estado>, private recetas: RecetasService) {}

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
    return { ...e, regiones: await this.recetas.regiones(id) };
  }
}
