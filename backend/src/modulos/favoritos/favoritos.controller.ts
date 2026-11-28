import { Controller, Delete, Get, Param, ParseIntPipe, Put, UseGuards } from '@nestjs/common';
import { SesionGuard, SesionUsuario, UsuarioActual } from '../../common/seguridad';
import { FavoritosService } from './favoritos.service';

@Controller('api/usuarios/yo/favoritos')
@UseGuards(SesionGuard)
export class FavoritosController {
  constructor(private svc: FavoritosService) {}

  @Get() listar(@UsuarioActual() s: SesionUsuario) { return this.svc.listar(s.idUs); }

  @Put(':idReceta')
  agregar(@UsuarioActual() s: SesionUsuario, @Param('idReceta', ParseIntPipe) id: number) { return this.svc.agregar(s.idUs, id); }

  @Delete(':idReceta')
  quitar(@UsuarioActual() s: SesionUsuario, @Param('idReceta', ParseIntPipe) id: number) { return this.svc.quitar(s.idUs, id); }
}
