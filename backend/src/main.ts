import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { UPLOADS_DIR } from './common/modulos';

async function bootstrap() {
  mkdirSync(UPLOADS_DIR, { recursive: true });
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = Number(process.env.PORT || 3000);
  await app.listen(port);
  console.log(`SIGEPA listo en http://localhost:${port}`);
}
bootstrap();
