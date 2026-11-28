import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { SesionGuard, SesionUsuario, UsuarioActual } from '../../common/seguridad';
import { PerfilDto } from './usuario.dto';
import { UsuariosService } from './usuarios.service';

@Controller('api/usuarios')
export class UsuariosController {
  constructor(private svc: UsuariosService) {}

  @Post('yo/portador') @UseGuards(SesionGuard)
  hacersePortador(@UsuarioActual() s: SesionUsuario) { return this.svc.hacersePortador(s.idUs); }

  /** Mis aportes: todas mis recetas, validadas, en revisión o rechazadas. */
  @Get('yo/recetas') @UseGuards(SesionGuard)
  misRecetas(@UsuarioActual() s: SesionUsuario) { return this.svc.misRecetas(s.idUs); }

  @Patch('yo') @UseGuards(SesionGuard)
  actualizar(@Body() dto: PerfilDto, @UsuarioActual() s: SesionUsuario) { return this.svc.actualizar(s.idUs, dto); }

  @Get(':id') publico(@Param('id', ParseIntPipe) id: number) { return this.svc.publico(id); }
}
