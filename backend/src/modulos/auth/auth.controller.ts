import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SesionGuard, SesionUsuario, UsuarioActual } from '../../common/seguridad';
import { LoginDto, RegistroDto } from './auth.dto';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  /** Límite más estricto contra intentos repetidos. */
  @Post('registro') @Throttle({ default: { limit: 10, ttl: 60_000 } })
  registro(@Body() dto: RegistroDto) { return this.auth.registrar(dto); }

  @Post('login') @HttpCode(200) @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto) { return this.auth.iniciarSesion(dto); }

  @Get('yo') @UseGuards(SesionGuard)
  yo(@UsuarioActual() s: SesionUsuario) { return this.auth.perfil(s.idUs); }
}
