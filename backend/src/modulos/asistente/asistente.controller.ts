import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PreguntaDto } from './asistente.dto';
import { AsistenteService } from './asistente.service';

@Controller('api/asistente')
export class AsistenteController {
  constructor(private readonly svc: AsistenteService) {}

  @Post() @HttpCode(200) @Throttle({ default: { limit: 30, ttl: 60_000 } })
  preguntar(@Body() dto: PreguntaDto) { return this.svc.responder(dto); }
}
