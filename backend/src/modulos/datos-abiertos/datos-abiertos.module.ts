import { Module } from '@nestjs/common';
import { RecetasModule } from '../recetas/recetas.module';
import { DatosAbiertosController } from './datos-abiertos.controller';

@Module({ imports: [RecetasModule], controllers: [DatosAbiertosController] })
export class DatosAbiertosModule {}
