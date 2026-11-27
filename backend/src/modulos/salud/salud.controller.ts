import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

/** Para Render (healthCheckPath) y monitoreo: responde si la API y la base están arriba. */
@Controller('api/salud')
export class SaludController {
  constructor(private db: DataSource) {}

  @Get()
  async revisar() {
    try {
      await this.db.query('SELECT 1');
      return { estado: 'ok', base: 'ok', hora: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException({ estado: 'error', base: 'sin conexión' });
    }
  }
}
