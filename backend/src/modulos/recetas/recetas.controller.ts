import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import {
  ModeradorGuard, PortadorGuard, SesionGuard, SesionOpcionalGuard, SesionUsuario, UsuarioActual,
} from '../../common/seguridad';
import { FiltrosReceta, RecetaDto, ValidacionDto } from './receta.dto';
import { DIFICULTADES, LICENCIAS, TIPOS_PLATILLO } from './receta.formato';
import { RecetasService } from './recetas.service';

@Controller('api/recetas')
export class RecetasController {
  constructor(private svc: RecetasService) {}

  @Get() buscar(@Query() f: FiltrosReceta) { return this.svc.buscar(f); }

  @Get('catalogos')
  catalogos() { return { dificultades: DIFICULTADES, tiposPlatillo: TIPOS_PLATILLO, licencias: LICENCIAS }; }

  @Get('mapa') puntos(@Query('estado') estado?: string) { return this.svc.puntos(Number(estado) || undefined); }

  @Get('regiones') regiones(@Query('estado') estado?: string) { return this.svc.regiones(Number(estado) || undefined); }

  @Get('pendientes') @UseGuards(ModeradorGuard) pendientes() { return this.svc.pendientes(); }

  @Get(':id') @UseGuards(SesionOpcionalGuard)
  detalle(@Param('id', ParseIntPipe) id: number, @UsuarioActual() s: SesionUsuario | null) { return this.svc.detalle(id, s); }

  @Get(':id/costo')
  costo(@Param('id', ParseIntPipe) id: number, @Query('personas') personas?: string) {
    return this.svc.costo(id, Number(personas) || undefined);
  }

  @Post() @UseGuards(PortadorGuard)
  crear(@Body() dto: RecetaDto, @UsuarioActual() s: SesionUsuario) { return this.svc.crear(dto, s); }

  @Put(':id') @UseGuards(PortadorGuard)
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: RecetaDto, @UsuarioActual() s: SesionUsuario) {
    return this.svc.actualizar(id, dto, s);
  }

  @Delete(':id') @UseGuards(SesionGuard)
  eliminar(@Param('id', ParseIntPipe) id: number, @UsuarioActual() s: SesionUsuario) { return this.svc.eliminar(id, s); }

  @Patch(':id/validacion') @UseGuards(ModeradorGuard)
  validar(@Param('id', ParseIntPipe) id: number, @Body() dto: ValidacionDto) { return this.svc.validar(id, dto.estadoValidacion); }
}
