import { Controller, Get, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Estado } from '../../database/entidades';
import { INGREDIENTES, identificar } from '../../dominio/ingredientes/catalogo';
import { MESES, enTemporada, mesActual } from '../../dominio/ingredientes/temporada';
import { RecetasService } from '../recetas/recetas.service';

const TIPOS = { recoleccion: 'Recolección', cultivo: 'Cultivo', pesca: 'Pesca', crianza: 'Crianza', elaborado: 'Elaborado' };

/**
 * Calendario de temporada: qué ingredientes se recolectan, cosechan o pescan en un mes,
 * en qué estados y qué recetas de SIGEPA los usan.
 */
@Controller('api/temporadas')
export class TemporadasController {
  constructor(private recetas: RecetasService, @InjectRepository(Estado) private estados: Repository<Estado>) {}

  @Get()
  async calendario(@Query('mes') mesTxt?: string, @Query('estado') estadoTxt?: string) {
    const mes = mesTxt !== undefined && Number(mesTxt) >= 0 && Number(mesTxt) <= 11 ? Number(mesTxt) : mesActual();
    const idEstado = Number(estadoTxt) || null;
    const [recetas, estados] = await Promise.all([this.recetas.validadas(), this.estados.find()]);
    const nombre = (id: number) => estados.find((e) => e.idEstado === id)?.nomEstado ?? String(id);

    const ingredientes = INGREDIENTES
      .filter((i) => i.origen && enTemporada(i.origen.temporada, mes) && (!idEstado || i.origen.estados.includes(idEstado)))
      .map((i) => {
        const usan = recetas.filter((r) => r.ingredientes.some((x) => {
          const y = identificar(x.nombre);
          return y && (y.id === i.id || y.familia === i.id);
        }));
        return {
          id: i.id, nombre: i.nombre, tipo: TIPOS[i.origen!.tipo], temporada: i.origen!.temporada ?? 'Todo el año',
          todoElAnio: /todo el a/i.test(i.origen!.temporada ?? ''),
          donde: i.origen!.donde, cuidado: i.origen!.cuidado ?? null,
          estados: i.origen!.estados.map((id) => ({ idEstado: id, nomEstado: nombre(id) })),
          recetas: usan.slice(0, 6).map((r) => ({ idReceta: r.idReceta, nombreReceta: r.nombreReceta, estado: r.estado.nomEstado })),
        };
      })
      // Primero lo que es propio de este mes (no todo el año) y lo que se recolecta
      .sort((a, b) => Number(a.todoElAnio) - Number(b.todoElAnio) || Number(b.tipo === 'Recolección') - Number(a.tipo === 'Recolección'));
    return { mes, nombreMes: MESES[mes], estado: idEstado ? { idEstado, nomEstado: nombre(idEstado) } : null, ingredientes };
  }
}
