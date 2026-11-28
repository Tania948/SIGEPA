import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../../database/entidades';
import { AuthModule } from '../auth/auth.module';
import { RecetasModule } from '../recetas/recetas.module';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

/** Perfiles públicos, edición del propio perfil y cambio de rol a portador de saberes. */
@Module({
  imports: [TypeOrmModule.forFeature([Usuario]), AuthModule, RecetasModule],
  controllers: [UsuariosController],
  providers: [UsuariosService],
})
export class UsuariosModule {}
