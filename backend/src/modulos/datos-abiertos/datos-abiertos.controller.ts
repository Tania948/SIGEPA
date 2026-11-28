import { Controller, Get, Header } from '@nestjs/common';
import { RecetasService } from '../recetas/recetas.service';

/**
 * Datos abiertos: las recetas validadas como GeoJSON y CSV para investigación, docencia o mapas propios.
 * Solo incluye datos públicos (sin correos) y conserva la autoría y la licencia que eligió cada portador.
 */
@Controller('api/datos-abiertos')
export class DatosAbiertosController {
  constructor(private recetas: RecetasService) {}

  @Get('recetas.geojson') @Header('Content-Type', 'application/geo+json; charset=utf-8')
  async geojson() {
    const recetas = await this.recetas.validadas();
    return {
      type: 'FeatureCollection',
      metadata: {
        fuente: 'SIGEPA — Patrimonio gastronómico mexicano', generado: new Date().toISOString(),
        nota: 'Cada receta conserva la licencia que eligió su portador o portadora (campo licencia).',
      },
      features: recetas.filter((r) => r.latitud != null && r.longitud != null).map((r) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [Number(r.longitud), Number(r.latitud)] },
        properties: {
          idReceta: r.idReceta, nombre: r.nombreReceta, nombreLengua: r.nombreLengua, lengua: r.lengua,
          estado: r.estado.nomEstado, municipio: r.municipio, claveMunicipio: r.cveMun, localidad: r.localidad,
          region: r.region, tipoPlatillo: r.tipoPlatillo, autor: r.autor.nombre, licencia: r.licenciaTexto,
          ingredientes: r.ingredientes.map((i) => i.nombre),
        },
      })),
    };
  }

  @Get('recetas.csv') @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="sigepa-recetas.csv"')
  async csv() {
    const recetas = await this.recetas.validadas();
    const celda = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const encabezado = ['idReceta', 'nombre', 'estado', 'municipio', 'claveMunicipio', 'localidad', 'latitud', 'longitud',
      'tipoPlatillo', 'porciones', 'tiempoTotal', 'autor', 'licencia', 'ingredientes'];
    const filas = recetas.map((r) => [r.idReceta, r.nombreReceta, r.estado.nomEstado, r.municipio, r.cveMun, r.localidad,
      r.latitud, r.longitud, r.tipoPlatillo, r.porciones, r.tiempoTotal, r.autor.nombre, r.licenciaTexto,
      r.ingredientes.map((i) => i.nombre).join('; ')].map(celda).join(','));
    return '﻿' + [encabezado.join(','), ...filas].join('\r\n');
  }
}
