import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Estado } from '../../database/entidades';
import { RecetasModule } from '../recetas/recetas.module';
import { EstadosController } from './estados.controller';

/** Catálogo de entidades federativas. */
@Module({
  imports: [TypeOrmModule.forFeature([Estado]), RecetasModule],
  controllers: [EstadosController],
})
export class EstadosModule {}
