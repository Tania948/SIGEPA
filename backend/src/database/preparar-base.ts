// Prepara la base de datos antes de que arranque la API:
//  1. Crea la base si no existe (si el usuario tiene permiso).
//  2. Si no hay tablas, ejecuta database/esquema.sql y database/datos.sql.
// Así basta con dar la conexión: no hay que importar el SQL a mano ni en local ni en la nube.
import { readFileSync } from 'fs';
import { join } from 'path';
import { createConnection } from 'mysql2/promise';
import { ConfigBaseDatos } from '../config/configuracion';
import { opcionesMysql } from './conexion';

const TABLAS = ['comentario', 'receta', 'usuario', 'estado'];

export async function prepararBaseDeDatos(
  db: ConfigBaseDatos,
  carpetaSql: string,
  { reiniciar = false, log = console.log }: { reiniciar?: boolean; log?: (m: string) => void } = {},
) {
  // 1. Base de datos
  const servidor = await createConnection(opcionesMysql(db, false));
  try {
    await servidor.query(
      `CREATE DATABASE IF NOT EXISTS \`${db.database.replace(/`/g, '')}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } catch (e) {
    log(`[base] No se pudo crear la base "${db.database}" (puede que ya exista o falten permisos): ${(e as Error).message}`);
  } finally {
    await servidor.end();
  }

  // 2. Tablas y datos
  const conexion = await createConnection(opcionesMysql(db, true));
  try {
    if (reiniciar) {
      log('[base] Reiniciando: se borran las tablas y los datos.');
      await conexion.query('SET FOREIGN_KEY_CHECKS = 0');
      await conexion.query('DROP VIEW IF EXISTS v_recetas_por_estado');
      for (const t of TABLAS) await conexion.query(`DROP TABLE IF EXISTS ${t}`);
      await conexion.query('SET FOREIGN_KEY_CHECKS = 1');
    }
    const [filas] = await conexion.query(
      'SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?', ['estado'],
    );
    if (Number((filas as Array<{ n: number }>)[0].n) > 0) {
      log('[base] Las tablas ya existen; no se modifican.');
      return { creada: false };
    }
    log('[base] Base vacía: creando tablas (esquema.sql)…');
    await conexion.query(readFileSync(join(carpetaSql, 'esquema.sql'), 'utf8'));
    log('[base] Cargando datos de ejemplo (datos.sql)…');
    await conexion.query(readFileSync(join(carpetaSql, 'datos.sql'), 'utf8'));
    log('[base] Lista: 32 estados, 21 cuentas y 68 recetas.');
    return { creada: true };
  } finally {
    await conexion.end();
  }
}
