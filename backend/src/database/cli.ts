// Uso:  npm run db:preparar   → crea tablas y datos si la base está vacía
//       npm run db:reiniciar  → borra todo y vuelve a cargar los datos de ejemplo
import { configuracion } from '../config/configuracion';
import { prepararBaseDeDatos } from './preparar-base';

const accion = process.argv[2] ?? 'preparar';
const cfg = configuracion();
prepararBaseDeDatos(cfg.db, cfg.carpetaSql, { reiniciar: accion === 'reiniciar' })
  .then(() => process.exit(0))
  .catch((e) => { console.error(`[base] Error: ${e.message}`); process.exit(1); });
