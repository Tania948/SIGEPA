import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AuthModule } from './auth/auth';
import { ComunidadModule, UPLOADS_DIR } from './common/modulos';
import { ENTITIES } from './entities';
import { RecetasModule } from './recetas/recetas';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'sigepa',
        socketPath: process.env.DB_SOCKET || undefined,
        entities: ENTITIES,
        charset: 'utf8mb4',
        // El esquema lo crea database/sigepa_schema.sql; no se sincroniza automáticamente.
        synchronize: false,
      }),
    }),
    JwtModule.registerAsync({ global: true, useFactory: () => ({ secret: process.env.JWT_SECRET || 'sigepa-dev' }) }),
    ServeStaticModule.forRoot(
      { rootPath: UPLOADS_DIR, serveRoot: '/uploads' },
      { rootPath: join(__dirname, '..', '..', 'frontend'), exclude: ['/api/(.*)'] },
    ),
    AuthModule, RecetasModule, ComunidadModule,
  ],
})
export class AppModule {}
