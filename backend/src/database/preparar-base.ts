// Prepara la base de datos antes de que arranque la API:
//  1. Crea la base si no existe (si el usuario tiene permiso).
//  2. Si no hay tablas, ejecuta database/esquema.sql y database/datos.sql.
//  3. Si encuentra el esquema anterior (sin normalizar), avisa en lugar de arrancar con tablas incompatibles.
//  4. Si una creación anterior quedó a medias y no hay cuentas, borra lo creado y vuelve a empezar.
// Así basta con dar la conexión: no hay que importar el SQL a mano ni en local ni en la nube.
import { readFileSync } from 'fs';
import { join } from 'path';
import { Connection, createConnection } from 'mysql2/promise';
import { ConfigBaseDatos } from '../config/configuracion';
import { opcionesMysql } from './conexion';

/** Todas las tablas, en orden de borrado (primero las que dependen de otras). */
const TABLAS = [
  'favorito', 'comentario', 'paso', 'receta_ingrediente', 'receta',
  'usuario', 'ingrediente', 'lengua', 'region', 'municipio', 'estado', 'tipo_usuario',
];
const VISTAS = ['v_receta_ficha', 'v_recetas_por_estado'];

async function tablasExistentes(conexion: Connection) {
  const [filas] = await conexion.query(
    'SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = \'BASE TABLE\'',
  );
  return new Set((filas as Array<{ t: string }>).map((f) => String(f.t).toLowerCase()));
}

async function tieneColumna(conexion: Connection, tabla: string, columna: string) {
  const [filas] = await conexion.query(
    'SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
    [tabla, columna],
  );
  return Number((filas as Array<{ n: number }>)[0].n) > 0;
}

async function borrarTodo(conexion: Connection) {
  await conexion.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const v of VISTAS) await conexion.query(`DROP VIEW IF EXISTS ${v}`);
  for (const t of TABLAS) await conexion.query(`DROP TABLE IF EXISTS ${t}`);
  await conexion.query('SET FOREIGN_KEY_CHECKS = 1');
}

export async function prepararBaseDeDatos(
  db: ConfigBaseDatos,
  carpetaSql: string,
  { reiniciar = false, log = console.log }: { reiniciar?: boolean; log?: (m: string) => void } = {},
) {
  // 1. Base de datos
  const servidor = await createConnection(opcionesMysql(db, false));
  try {
    await servidor.query(
      `CREATE DATABASE IF NOT EXISTS \`${db.database.replace(/`/g, '')}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`,
    );
  } catch (e) {
    log(`[base] No se pudo crear la base "${db.database}" (puede que ya exista o falten permisos): ${(e as Error).message}`);
  }
  try {
    // TiDB acepta CHECK pero solo los aplica con esta variable activa (antes de crear las tablas).
    const [version] = await servidor.query('SELECT VERSION() AS v');
    if (/tidb/i.test(String((version as Array<{ v: string }>)[0].v))) {
      await servidor.query('SET GLOBAL tidb_enable_check_constraint = ON')
        .then(() => log('[base] TiDB: restricciones CHECK activadas.'))
        .catch((e: Error) => log(`[base] TiDB: no se pudieron activar los CHECK (la API los valida igual): ${e.message}`));
    }
  } finally {
    await servidor.end();
  }

  // 2. Tablas y datos
  const conexion = await createConnection(opcionesMysql(db, true));
  try {
    if (reiniciar) {
      log('[base] Reiniciando: se borran las tablas y los datos.');
      await borrarTodo(conexion);
    }
    const hay = await tablasExistentes(conexion);
    const presentes = TABLAS.filter((t) => hay.has(t));
    if (presentes.length > 0) {
      if (hay.has('receta') && (await tieneColumna(conexion, 'receta', 'ingredientes'))) {
        throw new Error('La base tiene el esquema anterior (sin normalizar). Ejecuta "npm run db:reiniciar" en la carpeta '
          + 'backend para crear las 12 tablas nuevas; se borran los datos actuales y se cargan los de ejemplo.');
      }
      if (presentes.length === TABLAS.length) {
        log('[base] Las tablas ya existen; no se modifican.');
        return { creada: false };
      }
      // Faltan tablas del esquema nuevo: una creación anterior se interrumpió. Solo se limpia
      // automáticamente si no hay cuentas registradas, para no borrar nunca datos reales.
      const [u] = hay.has('usuario') ? await conexion.query('SELECT COUNT(*) AS n FROM usuario') : [[{ n: 0 }]];
      if (Number((u as Array<{ n: number }>)[0].n) > 0) {
        throw new Error(`Faltan tablas (${TABLAS.filter((t) => !hay.has(t)).join(', ')}) y ya hay cuentas registradas. `
          + 'Revisa la base o ejecuta "npm run db:reiniciar" en la carpeta backend (borra los datos actuales).');
      }
      log(`[base] Creación anterior incompleta (${presentes.length} de ${TABLAS.length} tablas): se vuelve a crear.`);
      await borrarTodo(conexion);
    }
    log('[base] Base vacía: creando tablas (esquema.sql)…');
    await conexion.query(readFileSync(join(carpetaSql, 'esquema.sql'), 'utf8'));
    log('[base] Cargando datos de ejemplo (datos.sql)…');
    await conexion.query(readFileSync(join(carpetaSql, 'datos.sql'), 'utf8'));
    log('[base] Lista: 12 tablas, 2,475 municipios, 21 cuentas y 68 recetas.');
    return { creada: true };
  } finally {
    await conexion.end();
  }
}
