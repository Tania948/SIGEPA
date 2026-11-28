import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Estado } from '../../database/entidades';
import { RecetasService } from '../recetas/recetas.service';

@Controller('api/estados')
export class EstadosController {
  constructor(@InjectRepository(Estado) private estados: Repository<Estado>, private recetas: RecetasService) {}

  /** Catálogo de estados con el número de recetas validadas (vista v_recetas_por_estado). */
  @Get()
  async listar() {
    const filas: Array<{ idEstado: number; nomEstado: string; totalRecetas: number }> = await this.estados.query(
      'SELECT idEstado, nomEstado, totalRecetas FROM v_recetas_por_estado ORDER BY nomEstado',
    );
    return filas.map((f) => ({ idEstado: Number(f.idEstado), nomEstado: f.nomEstado, totalRecetas: Number(f.totalRecetas) }));
  }

  @Get(':id')
  async detalle(@Param('id', ParseIntPipe) id: number) {
    const e = await this.estados.findOneBy({ idEstado: id });
    if (!e) throw new NotFoundException('No encontramos ese estado.');
    return { ...e, regiones: await this.recetas.regiones(id) };
  }
}
