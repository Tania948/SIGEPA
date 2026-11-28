// Configuración de SIGEPA. Es el único lugar que lee variables de entorno.
//
// En local se leen de backend/.env. En Render se definen en el panel o en render.yaml.
// La base de datos se configura con DATABASE_URL (recomendado en la nube) o con DB_HOST, DB_USER, etc.
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

export interface ConfigBaseDatos {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  socketPath?: string;
  /** TLS obligatorio en servicios en la nube como TiDB Cloud. */
  ssl: boolean;
}

export interface Configuracion {
  entorno: 'development' | 'production' | 'test';
  puerto: number;
  jwtSecreto: string;
  db: ConfigBaseDatos;
  /** Crea las tablas y carga los datos de ejemplo cuando la base está vacía. */
  prepararBase: boolean;
  /** Carpeta del front (HTML, CSS y JS) que sirve la API. */
  carpetaFrontend: string;
  /** Carpeta de fotos subidas por portadores. */
  carpetaSubidas: string;
  /** Carpeta con esquema.sql y datos.sql. */
  carpetaSql: string;
}

/** Carga backend/.env si existe, sin sobrescribir variables ya definidas (como hace dotenv). */
function cargarArchivoEnv() {
  const ruta = resolve(__dirname, '..', '..', '.env');
  if (!existsSync(ruta)) return;
  for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const verdadero = (v?: string) => ['1', 'true', 'si', 'sí', 'yes'].includes((v ?? '').toLowerCase());

function leerBaseDatos(env: NodeJS.ProcessEnv): ConfigBaseDatos {
  if (env.DATABASE_URL) {
    const url = new URL(env.DATABASE_URL);
    const ssl = url.searchParams.get('ssl');
    return {
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.replace(/^\//, '')) || 'sigepa',
      ssl: ssl ? verdadero(ssl) || ssl === 'required' : verdadero(env.DB_SSL ?? 'true'),
    };
  }
  return {
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'sigepa',
    socketPath: env.DB_SOCKET || undefined,
    ssl: verdadero(env.DB_SSL),
  };
}

let cache: Configuracion | null = null;

export function configuracion(): Configuracion {
  if (cache) return cache;
  cargarArchivoEnv();
  const env = process.env;
  const entorno = (env.NODE_ENV === 'production' || env.NODE_ENV === 'test' ? env.NODE_ENV : 'development') as Configuracion['entorno'];
  const jwtSecreto = env.JWT_SECRET || '';
  if (!jwtSecreto && entorno === 'production') {
    throw new Error('Falta JWT_SECRET. Defínelo en las variables de entorno del servidor.');
  }
  const raiz = resolve(__dirname, '..', '..', '..');
  cache = {
    entorno,
    puerto: Number(env.PORT || 3000),
    jwtSecreto: jwtSecreto || 'sigepa-desarrollo-local',
    db: leerBaseDatos(env),
    prepararBase: env.DB_PREPARAR === undefined ? true : verdadero(env.DB_PREPARAR),
    carpetaFrontend: join(raiz, 'frontend'),
    carpetaSubidas: resolve(env.UPLOADS_DIR || join(raiz, 'backend', 'uploads')),
    carpetaSql: join(raiz, 'database'),
  };
  return cache;
}
