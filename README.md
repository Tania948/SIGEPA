# SIGEPA MX

**Sistema Georreferenciado y Participativo para la Preservación y Sustentabilidad del Patrimonio Gastronómico Mexicano.**
Proyecto de Ingeniería de Software, ESCOM-IPN.

SIGEPA no es solo un recetario: cada receta está ubicada en su municipio, la publica una persona portadora de
saberes de su comunidad, pasa por moderación y se comparte con una licencia que ella elige.

## Qué hace

- **Mapa de México** con los 32 estados y 2,475 municipios (INEGI) y las recetas ubicadas en cada uno.
- **Búsqueda** por nombre, ingrediente, estado, municipio, región, tipo de platillo, dificultad y tiempo.
- **Publicación participativa:** solo portadores de saberes publican; un moderador valida antes de que aparezca.
  Al publicar se pide consentimiento informado y se elige la licencia (saber comunitario o CC BY-NC-SA).
- **Asistente** sin servicios externos: "tengo 200 pesos para 4 personas", "¿dónde se recolecta la hierba santa?".
- **Costo estimado** de cada receta con precios de referencia (Profeco/SNIIM 2026).
- **Calendario de temporada:** qué ingredientes hay cada mes en cada estado y qué recetas los usan.
- **Modo cocina:** pasos en pantalla completa, lectura en voz alta, temporizadores detectados en el texto,
  comandos de voz ("siguiente", "repite") y pantalla siempre encendida.
- **Dictado por voz** al publicar, para quien prefiere contar la receta que escribirla.
- **Lenguas originarias:** interfaz en español, maya yucateco y náhuatl, y nombre del platillo en su lengua.
- **Datos abiertos:** todas las recetas validadas en GeoJSON y CSV para investigación.
- **App instalable (PWA)** que guarda lo visitado y funciona sin conexión.
- Fotos reales de **Wikimedia Commons** con su crédito y licencia.

## Probarlo en línea

La versión publicada corre en Render con la base en TiDB Cloud. Cómo publicarla: [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md).

## Correrlo en tu computadora

Necesitas **Node.js 20 o más** y **MySQL 8** (o MariaDB).

```bash
cd backend
copy .env.example .env     # en Windows (en Mac/Linux: cp .env.example .env)
# abre .env y pon tu usuario y contraseña de MySQL
npm install
npm run build
npm start
```

Abre <http://localhost:3000>. **No hace falta cargar el SQL a mano:** al arrancar, la API crea la base `sigepa`,
sus tablas y los datos de ejemplo si no existen. Para volver a los datos de ejemplo: `npm run db:reiniciar`.

### Cuentas de ejemplo (contraseña `Sigepa2026`)

| Correo | Rol |
|---|---|
| admin@sigepa.mx | Moderador |
| elena.martinez@correo.mx | Portadora de saberes (Oaxaca) |
| maria.pech@correo.mx | Portadora de saberes (Yucatán) |
| diego.ramirez@correo.mx | Usuario |

La base trae **68 recetas** de los 32 estados (67 validadas y 1 en revisión), de 18 portadores de saberes.

## Estructura

```
backend/            API REST en NestJS + TypeORM; también sirve el front
  src/config/         variables de entorno
  src/database/       entidades (diccionario de datos), conexión y creación automática
  src/common/         sesión JWT y guardias por rol
  src/dominio/        lógica pura: precios, costos, temporadas (con pruebas)
  src/modulos/        auth, usuarios, recetas, comentarios, estados, archivos,
                      asistente, temporadas, datos-abiertos, salud
frontend/           HTML5, CSS3 y JavaScript (módulos ES, sin frameworks)
  js/nucleo/          API, idiomas, fotos, PWA
  js/componentes/     encabezado, tarjetas, mapa, asistente, modo cocina, dictado
  js/paginas/         un archivo por pantalla
database/           esquema.sql (tablas) y datos.sql (datos de ejemplo)
docs/               arquitectura, despliegue y mantenimiento
render.yaml         despliegue en Render
```

Más detalle en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md). Para cambios frecuentes (precios, campos nuevos,
traducciones, fotos): [docs/MANTENIMIENTO.md](docs/MANTENIMIENTO.md).

## Roles (`usuario.tipoUsu`)

| tipoUsu | Rol | Qué puede hacer |
|---|---|---|
| 1 | Moderador | Valida o rechaza recetas y modera comentarios |
| 2 | Usuario | Explora el mapa, busca, guarda favoritas y comenta |
| 3 | Portador(a) de saberes | Todo lo anterior y además **publica recetas** de su comunidad |

Un usuario puede pasar a portador desde "Publicar receta".

## API

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/registro` | Crear cuenta |
| POST | `/api/auth/login` | Iniciar sesión (devuelve token JWT) |
| GET | `/api/auth/yo` | Sesión actual |
| GET | `/api/estados`, `/api/estados/:id` | Estados con número de recetas validadas |
| GET | `/api/recetas?q=&ing=&estado=&mun=&region=&tipo=&dificultad=&tiempoMax=&orden=&page=` | Búsqueda |
| GET | `/api/recetas/mapa`, `/api/recetas/regiones` | Puntos del mapa y regiones |
| GET | `/api/recetas/:id` | Detalle de una receta |
| GET | `/api/recetas/:id/costo?personas=` | Costo estimado de los ingredientes |
| POST / PUT / DELETE | `/api/recetas[/:id]` | Publicar, editar o borrar una receta propia (portador) |
| GET | `/api/recetas/pendientes` | Recetas por validar (moderador) |
| PATCH | `/api/recetas/:id/validacion` | Validar o rechazar (moderador) |
| GET / POST | `/api/recetas/:id/comentarios` | Comentarios |
| PATCH / DELETE | `/api/comentarios/:id` | Moderar o borrar un comentario |
| POST | `/api/asistente` | Pregunta al asistente (`{ mensaje }`) |
| GET | `/api/temporadas?mes=&estado=` | Ingredientes en temporada |
| GET | `/api/datos-abiertos/recetas.geojson`, `.../recetas.csv` | Datos abiertos |
| GET / PATCH | `/api/usuarios/:id`, `/api/usuarios/yo` | Perfil público y editar el propio |
| GET | `/api/usuarios/yo/recetas` | Mis aportes |
| POST | `/api/usuarios/yo/portador` | Pasar a portador de saberes |
| POST | `/api/uploads` | Subir fotografía (campo `foto`) |
| GET | `/api/salud` | Estado del servicio y de la base |

## Base de datos

Sigue el **Diccionario de datos (10.2)**: tablas `usuario`, `receta`, `estado` y `comentario` con los mismos campos,
tipos y longitudes, más `receta.urlImagen` del **Modelo E-R (10.1)**. Los datos del diseño sin columna propia
(ingredientes con cantidad, pasos, municipio, coordenadas, lengua, licencia…) van como JSON en `receta.ingredientes`
y `receta.preparacion`. Favoritos y borradores se guardan en el navegador de cada usuario.

## Créditos

- Fronteras: Marco Geoestadístico de INEGI (versión de CONABIO). Mapas: © OpenStreetMap y Esri.
- Fotografías: Wikimedia Commons, con autor y licencia en la página **Créditos** del sitio.
- Tipografías Inter y Lora (SIL Open Font License), incluidas en `frontend/assets/fuentes`.
- Las traducciones al maya y al náhuatl son una primera versión que deben revisar hablantes de cada lengua.
