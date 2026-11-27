import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Estado } from '../../database/entidades';
import { RecetasModule } from '../recetas/recetas.module';
import { AsistenteController } from './asistente.controller';
import { AsistenteService } from './asistente.service';

/** Asistente conversacional: presupuesto, origen y recolección de ingredientes, y búsqueda con mapa. */
@Module({
  imports: [TypeOrmModule.forFeature([Estado]), RecetasModule],
  controllers: [AsistenteController],
  providers: [AsistenteService],
})
export class AsistenteModule {}
