# SIGEPA MX

Sistema Georreferenciado y Participativo para la Preservación y Sustentabilidad del Patrimonio Gastronómico Mexicano.
Proyecto de Ingeniería de Software, ESCOM-IPN.

## Estructura

```
database/   Script de MySQL: tablas del diccionario de datos y datos de ejemplo
backend/    API REST en NestJS + TypeORM; también sirve el front
frontend/   Front en HTML5, CSS3 y JavaScript (sin frameworks), según el diseño de Figma
```

## Cómo correrlo

1. **Base de datos.** Ejecuta `database/sigepa_schema.sql` en MySQL 8 (Workbench, o desde terminal):
   ```bash
   mysql -u root -p < database/sigepa_schema.sql
   ```
2. **API.** En la carpeta `backend`:
   ```bash
   cp .env.example .env      # pon tu usuario y contraseña de MySQL
   npm install
   npm run build
   npm start
   ```
3. Abre <http://localhost:3000>.

### Cuentas de ejemplo (contraseña `Sigepa2026`)

| Correo | Rol |
|---|---|
| admin@sigepa.mx | Administrador: valida recetas y modera comentarios |
| elena.martinez@correo.mx | Usuaria con recetas de Oaxaca |
| ana.lopez@correo.mx | Usuaria con favoritos guardados |

Las recetas nuevas quedan **en revisión** (`estadoValidacion = 'pendiente'`) hasta que un administrador las valida
(`PATCH /api/recetas/:id/validacion`). Solo las recetas validadas aparecen en el mapa y en las búsquedas.

**Recuperar contraseña:** el prototipo no envía correos. Al solicitar la recuperación, el enlace para restablecer
la contraseña aparece en la consola donde corre `npm start`.

## API

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/registro` | Crear cuenta |
| POST | `/api/auth/login` | Iniciar sesión (devuelve token JWT) |
| POST | `/api/auth/recuperar` | Solicitar enlace de recuperación |
| GET / POST | `/api/auth/restablecer[/:token]` | Validar el enlace y guardar la nueva contraseña |
| GET | `/api/estados` | Estados con número de recetas validadas |
| GET | `/api/estados/:id` | Detalle de un estado y sus regiones |
| GET | `/api/recetas?q=&nombre=&ing=&ingModo=&estado=&region=&tipo=&dificultad=&tiempo=&tiempoMax=&conFoto=&orden=&page=` | Búsqueda |
| GET | `/api/recetas/regiones?estado=` | Regiones registradas en recetas |
| GET | `/api/recetas/:id` | Detalle de una receta |
| POST / PUT / DELETE | `/api/recetas[/:id]` | Publicar, editar o borrar una receta propia |
| GET | `/api/recetas/pendientes` | Recetas por validar (administrador) |
| PATCH | `/api/recetas/:id/validacion` | Validar o rechazar (administrador) |
| GET / POST | `/api/recetas/:id/comentarios` | Comentarios |
| GET | `/api/usuarios/:id` | Perfil público |
| GET | `/api/usuarios/yo/recetas` | Mis aportes |
| PATCH | `/api/usuarios/yo` | Editar mi perfil |
| POST | `/api/uploads` | Subir fotografía (campo `foto`) |

## Base de datos

El script sigue el **Diccionario de datos (10.2)**: tablas `usuario`, `receta`, `estado` y `comentario` con los mismos
campos, tipos y longitudes. La única columna adicional es `receta.urlImagen`, que el **Modelo E-R (10.1)** define como
`url_imagen`.

Los datos que pide el diseño y que no tienen columna propia se guardan así:

| Dato del diseño | Dónde se guarda |
|---|---|
| Ingredientes con cantidad y unidad | `receta.ingredientes` (TEXT) como JSON |
| Pasos, porciones, tiempo total, dificultad, tipo de platillo, región, localidad, latitud/longitud, consejo e historia | `receta.preparacion` (TEXT) como JSON |
| Zona y texto de presentación de cada estado | `frontend/js/catalogos.js` (contenido fijo) |
| Favoritos y borradores | En el navegador de cada usuario (`localStorage`) |
| Foto de perfil, biografía | No se guardan; el perfil muestra las iniciales |
