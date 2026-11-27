import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ModeradorGuard, SesionGuard, SesionUsuario, UsuarioActual } from '../../common/seguridad';
import { ComentarioDto, ModeracionDto } from './comentario.dto';
import { ComentariosService } from './comentarios.service';

@Controller('api')
export class ComentariosController {
  constructor(private svc: ComentariosService) {}

  @Get('recetas/:id/comentarios')
  listar(@Param('id', ParseIntPipe) id: number) { return this.svc.deReceta(id); }

  @Post('recetas/:id/comentarios') @UseGuards(SesionGuard)
  crear(@Param('id', ParseIntPipe) id: number, @Body() dto: ComentarioDto, @UsuarioActual() s: SesionUsuario) {
    return this.svc.crear(id, dto.comentario, s);
  }

  @Patch('comentarios/:id') @UseGuards(ModeradorGuard)
  moderar(@Param('id', ParseIntPipe) id: number, @Body() dto: ModeracionDto) { return this.svc.moderar(id, dto.estadoComentario); }

  @Delete('comentarios/:id') @UseGuards(SesionGuard)
  eliminar(@Param('id', ParseIntPipe) id: number, @UsuarioActual() s: SesionUsuario) { return this.svc.retirar(id, s); }
}
