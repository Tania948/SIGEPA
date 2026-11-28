import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favorito, Receta } from '../../database/entidades';
import { FavoritosController } from './favoritos.controller';
import { FavoritosService } from './favoritos.service';

/** Favoritos de cada usuario, guardados en la base (antes vivían solo en el navegador). */
@Module({
  imports: [TypeOrmModule.forFeature([Favorito, Receta])],
  controllers: [FavoritosController],
  providers: [FavoritosService],
})
export class FavoritosModule {}
