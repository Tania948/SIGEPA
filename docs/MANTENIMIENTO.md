# Guía de mantenimiento

Recetario de cambios frecuentes. Antes de subir cualquier cambio:

```bash
cd backend
npm test        # pruebas de la lógica de dominio y del asistente
npm run build   # compila TypeScript
```

GitHub Actions corre lo mismo (y arranca la API contra MySQL 8) en cada push.

## Agregar un campo a las recetas

1. `database/esquema.sql` — agrega la columna a `receta` (con su CHECK si tiene valores fijos) y descríbela en
   `docs/BASE_DE_DATOS.md` (diccionario de datos y diagrama E-R).
2. `backend/src/database/entidades/receta.entity.ts` — agrega la propiedad con `@Column`.
3. `backend/src/modulos/recetas/receta.dto.ts` — agrega la validación si el portador lo captura.
4. `backend/src/modulos/recetas/recetas.service.ts` (`guardar`) y `receta.formato.ts` (`serializarReceta`) — guárdalo y
   devuélvelo en la API.
5. Front: el formulario en `frontend/publicar.html` + `js/paginas/publicar.js`, y la vista en `js/paginas/receta.js`.
6. En una base ya creada aplica el `ALTER TABLE` a mano (la API solo crea tablas cuando la base está vacía), o
   reinicia los datos de ejemplo con `npm run db:reiniciar`.

Si el dato puede repetirse en muchas recetas (como la región o la lengua), hazlo catálogo: tabla propia, llave
foránea en `receta` y búsqueda o alta en `guardar()` con `this.catalogo(...)`.

## Catálogos

- **Municipios**: vienen del Marco Geoestadístico del INEGI (los mismos que dibuja el mapa en
  `frontend/assets/mapa/municipios`). No se capturan a mano.
- **Regiones, lenguas e ingredientes**: crecen con la comunidad; si al publicar se escribe uno nuevo, la API lo agrega.
  Para corregir un nombre basta con editar su fila: todas las recetas que lo usan se actualizan.
- **Roles**: tabla `tipo_usuario`, con su espejo `TipoUsuario` en `backend/src/database/entidades/tipos.ts`.

## Actualizar precios u origen de ingredientes

Todo está en `backend/src/dominio/ingredientes/catalogo.ts`: nombre, sinónimos, precio por unidad base,
estados donde se produce o recolecta y meses de temporada. Lo usan el asistente, el costo estimado de cada receta
y la página de temporadas. Si cambias la forma de un ingrediente, corre `npm test`.

## Traducciones (español, maya yucateco, náhuatl)

`frontend/js/nucleo/idioma.js`. Cada texto de la interfaz es una clave con sus tres versiones. Las traducciones
deben revisarlas hablantes de cada lengua antes de darlas por finales.

## Fotos

Las fotos de ejemplo vienen de **Wikimedia Commons** con licencia libre; cada una muestra el crédito y enlaza a su
ficha.

- Fotos fijas de la interfaz: `frontend/js/nucleo/fotos.js` (objeto `FOTOS`).
- Fotos de recetas: columna `urlImagen` en `database/datos.sql`.
- Dirección de un archivo de Commons: `https://upload.wikimedia.org/wikipedia/commons/thumb/A/AB/Nombre.jpg/960px-Nombre.jpg`,
  donde `A` y `AB` son el primer y los dos primeros caracteres del MD5 de `Nombre.jpg` (con guiones bajos).
  La forma más sencilla de obtenerla es abrir la ficha del archivo en Commons y copiar la dirección de la imagen.
- Si una foto no carga, el front muestra un fondo de respaldo, así que una dirección rota no rompe la página.

## Agregar un módulo nuevo a la API

1. Crea `backend/src/modulos/<nombre>/` con `<nombre>.controller.ts`, `<nombre>.service.ts` y `<nombre>.module.ts`
   (copia la forma de `temporadas/`).
2. La lógica que no depende de la base va en `backend/src/dominio/`, con su prueba `*.spec.ts`.
3. Registra el módulo en `backend/src/app.module.ts`.
4. Protege las rutas con las guardias de `common/seguridad` (`SesionGuard`, `PortadorGuard`, `ModeradorGuard`).

## Después de cambiar el front

Sube el número de `VERSION` en `frontend/sw.js`. Así los navegadores que ya instalaron la app descargan los
archivos nuevos en lugar de usar los guardados.

## Variables de entorno

| Variable | Uso |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexión a MySQL / TiDB |
| `DB_SSL` | `true` para bases en la nube |
| `DATABASE_URL` | Alternativa en una sola línea (`mysql://usuario:contraseña@host:puerto/base`) |
| `DB_PREPARAR` | `false` para que la API no cree tablas al arrancar |
| `JWT_SECRET` | Firma de sesiones (obligatoria en producción) |
| `UPLOADS_DIR` | Carpeta de fotos subidas (por defecto `backend/uploads`) |
| `PORT`, `NODE_ENV` | Puerto y modo (`production` en Render) |
