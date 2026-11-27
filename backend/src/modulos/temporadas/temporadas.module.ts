import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Estado } from '../../database/entidades';
import { RecetasModule } from '../recetas/recetas.module';
import { TemporadasController } from './temporadas.controller';

@Module({ imports: [TypeOrmModule.forFeature([Estado]), RecetasModule], controllers: [TemporadasController] })
export class TemporadasModule {}
