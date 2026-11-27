import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Estado, Receta } from '../../database/entidades';
import { RecetasController } from './recetas.controller';
import { RecetasService } from './recetas.service';

/** Búsqueda, detalle, publicación (portadores) y validación (moderador) de recetas. */
@Module({
  imports: [TypeOrmModule.forFeature([Receta, Estado])],
  controllers: [RecetasController],
  providers: [RecetasService],
  exports: [RecetasService],
})
export class RecetasModule {}
