import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { configuracion } from './config/configuracion';
import { opcionesTypeOrm } from './database/conexion';
import { ArchivosModule } from './modulos/archivos/archivos.module';
import { AsistenteModule } from './modulos/asistente/asistente.module';
import { AuthModule } from './modulos/auth/auth.module';
import { ComentariosModule } from './modulos/comentarios/comentarios.module';
import { DatosAbiertosModule } from './modulos/datos-abiertos/datos-abiertos.module';
import { EstadosModule } from './modulos/estados/estados.module';
import { FavoritosModule } from './modulos/favoritos/favoritos.module';
import { RecetasModule } from './modulos/recetas/recetas.module';
import { SaludModule } from './modulos/salud/salud.module';
import { TemporadasModule } from './modulos/temporadas/temporadas.module';
import { UsuariosModule } from './modulos/usuarios/usuarios.module';

const cfg = configuracion();

/**
 * Composición de la aplicación. Cada carpeta de src/modulos es un módulo de dominio con su
 * controlador (rutas HTTP), servicio (reglas) y DTOs (validación). Ver docs/ARQUITECTURA.md.
 */
@Module({
  imports: [
    TypeOrmModule.forRoot(opcionesTypeOrm(cfg.db)),
    JwtModule.register({ global: true, secret: cfg.jwtSecreto }),
    // Límite general de peticiones por IP (los módulos sensibles ponen uno más estricto).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    ServeStaticModule.forRoot(
      { rootPath: cfg.carpetaSubidas, serveRoot: '/uploads' },
      { rootPath: cfg.carpetaFrontend, exclude: ['/api/(.*)'], serveStaticOptions: { maxAge: cfg.entorno === 'production' ? 3600_000 : 0 } },
    ),
    AuthModule, UsuariosModule, RecetasModule, ComentariosModule, EstadosModule, ArchivosModule,
    FavoritosModule, AsistenteModule, TemporadasModule, DatosAbiertosModule, SaludModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
