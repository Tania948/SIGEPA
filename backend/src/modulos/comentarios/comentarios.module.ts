import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comentario, Receta } from '../../database/entidades';
import { ComentariosController } from './comentarios.controller';
import { ComentariosService } from './comentarios.service';

/** Comentarios de la comunidad y su moderación. */
@Module({
  imports: [TypeOrmModule.forFeature([Comentario, Receta])],
  controllers: [ComentariosController],
  providers: [ComentariosService],
})
export class ComentariosModule {}
