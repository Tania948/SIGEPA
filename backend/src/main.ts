import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import { mkdirSync } from 'fs';
import helmet from 'helmet';
import { configuracion } from './config/configuracion';
import { prepararBaseDeDatos } from './database/preparar-base';

/** Orígenes externos que usa el front: mapas (OpenStreetMap, Esri) y fotos de Wikimedia Commons. */
const IMAGENES_EXTERNAS = [
  'https://tile.openstreetmap.org', 'https://*.tile.openstreetmap.org',
  'https://server.arcgisonline.com', 'https://upload.wikimedia.org',
];

async function arrancar() {
  const cfg = configuracion();
  const log = new Logger('SIGEPA');
  mkdirSync(cfg.carpetaSubidas, { recursive: true });

  // 1. Base de datos: crea tablas y datos de ejemplo si está vacía.
  if (cfg.prepararBase) {
    await prepararBaseDeDatos(cfg.db, cfg.carpetaSql, { log: (m) => log.log(m) });
  }

  // 2. API + front
  const app = await NestFactory.create<NestExpressApplication>(await import('./app.module').then((m) => m.AppModule));
  const produccion = cfg.entorno === 'production';
  app.set('trust proxy', 1); // Render y otros servicios ponen un proxy delante
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"], // Leaflet posiciona el mapa con estilos en línea
        'img-src': ["'self'", 'data:', 'blob:', ...IMAGENES_EXTERNAS],
        'connect-src': ["'self'"],
        'font-src': ["'self'", 'data:'],
        'worker-src': ["'self'"],
        'upgrade-insecure-requests': produccion ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: produccion,
  }));
  app.use(compression());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();
  await app.listen(cfg.puerto, '0.0.0.0');
  log.log(`Listo en http://localhost:${cfg.puerto} (${cfg.entorno})`);
}

arrancar().catch((e) => {
  console.error(`[SIGEPA] No se pudo arrancar: ${e.message}`);
  if (/ECONNREFUSED|ENOTFOUND|Access denied|ER_ACCESS_DENIED/.test(e.message)) {
    console.error('[SIGEPA] Revisa la conexión a MySQL en backend/.env (DB_HOST, DB_USER, DB_PASSWORD) o DATABASE_URL.');
  }
  process.exit(1);
});
