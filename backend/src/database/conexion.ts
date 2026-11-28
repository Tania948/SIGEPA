import type { ConnectionOptions } from 'mysql2';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigBaseDatos } from '../config/configuracion';
import { ENTIDADES } from './entidades';

/** TLS para bases en la nube (TiDB Cloud, Aiven, PlanetScale…). Usa los certificados del sistema. */
const tls = (db: ConfigBaseDatos) => (db.ssl ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined);

/** Opciones de mysql2 para los scripts de preparación de la base. */
export function opcionesMysql(db: ConfigBaseDatos, conBase = true): ConnectionOptions {
  return {
    host: db.host, port: db.port, user: db.user, password: db.password, socketPath: db.socketPath,
    database: conBase ? db.database : undefined, ssl: tls(db), charset: 'utf8mb4_unicode_ci',
    multipleStatements: true, connectTimeout: 20_000,
  };
}

/** Opciones de TypeORM para la API. */
export function opcionesTypeOrm(db: ConfigBaseDatos): TypeOrmModuleOptions {
  return {
    type: 'mysql',
    host: db.host, port: db.port, username: db.user, password: db.password, database: db.database,
    socketPath: db.socketPath, ssl: tls(db), charset: 'utf8mb4',
    entities: ENTIDADES,
    // El esquema vive en database/esquema.sql (fuente única); TypeORM no lo modifica.
    synchronize: false,
    retryAttempts: 5, retryDelay: 3000,
    extra: { connectionLimit: 5 },
  };
}
