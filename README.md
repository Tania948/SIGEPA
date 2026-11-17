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

### Tipos de usuario (`usuario.tipoUsu`)

| tipoUsu | Rol | Qué puede hacer |
|---|---|---|
| 1 | Administrador | Valida o rechaza recetas y modera comentarios |
| 2 | Usuario | Explora el mapa, busca, guarda favoritas y comenta |
| 3 | Portador(a) de saberes | Todo lo anterior y además **publica recetas** de su comunidad |

Al registrarse se elige el rol. Un usuario puede pasar a portador desde "Publicar receta"
(`POST /api/usuarios/yo/portador`). La API rechaza publicar o subir fotos a quien no sea portador o administrador.

### Cuentas de ejemplo (contraseña `Sigepa2026`)

| Correo | Rol |
|---|---|
| admin@sigepa.mx | Administrador |
| elena.martinez@correo.mx | Portadora de saberes (Oaxaca) |
| maria.pech@correo.mx | Portadora de saberes (Yucatán) |
| diego.ramirez@correo.mx | Usuario (no publica) |
| sofia.mendoza@correo.mx | Usuaria (no publica) |

La base trae **68 recetas** de los 32 estados, compartidas por 18 portadores de saberes, cada una con municipio,
localidad y coordenadas.

Las recetas nuevas quedan **en revisión** (`estadoValidacion = 'pendiente'`) hasta que un administrador las valida
(`PATCH /api/recetas/:id/validacion`). Solo las recetas validadas aparecen en el mapa y en las búsquedas.

**Recuperar contraseña:** el prototipo no envía correos. Al solicitar la recuperación, el enlace para restablecer
la contraseña aparece en la consola donde corre `npm start`.

## Mapa

El mapa usa **Leaflet** (incluido en `frontend/vendor`) con dos fondos de mapa: OpenStreetMap/CARTO y una vista
satelital de Esri. Las fronteras de los **32 estados y 2,475 municipios** vienen del Marco Geoestadístico de
INEGI (versión publicada por CONABIO), simplificadas a TopoJSON en `frontend/assets/mapa/`. Los municipios de cada
estado se cargan solo cuando se elige ese estado. Los fondos de mapa necesitan internet; las fronteras no.

## Idiomas

El selector de la barra superior (y del menú lateral) cambia la interfaz a **maya yucateco (Maaya t'aan)** o
**náhuatl (Nawatlahtolli)**. Los textos están en `frontend/js/idioma.js`, un diccionario de frases
`[español, maya, náhuatl]`. Las traducciones son una **primera versión que debe revisar un hablante de cada lengua**.
El contenido de las recetas no se traduce: se muestra en la lengua en que lo escribió su portador.

## API

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/registro` | Crear cuenta |
| POST | `/api/auth/login` | Iniciar sesión (devuelve token JWT) |
| POST | `/api/auth/recuperar` | Solicitar enlace de recuperación |
| GET / POST | `/api/auth/restablecer[/:token]` | Validar el enlace y guardar la nueva contraseña |
| GET | `/api/estados` | Estados con número de recetas validadas |
| GET | `/api/estados/:id` | Detalle de un estado y sus regiones |
| GET | `/api/recetas?q=&nombre=&ing=&ingModo=&estado=&mun=&region=&tipo=&dificultad=&tiempo=&tiempoMax=&conFoto=&orden=&page=` | Búsqueda (`mun` = clave INEGI del municipio) |
| GET | `/api/recetas/mapa` | Puntos de las recetas validadas para el mapa |
| GET | `/api/recetas/regiones?estado=` | Regiones registradas en recetas |
| GET | `/api/recetas/:id` | Detalle de una receta |
| POST / PUT / DELETE | `/api/recetas[/:id]` | Publicar, editar o borrar una receta propia (portador) |
| GET | `/api/recetas/pendientes` | Recetas por validar (administrador) |
| PATCH | `/api/recetas/:id/validacion` | Validar o rechazar (administrador) |
| GET / POST | `/api/recetas/:id/comentarios` | Comentarios |
| GET | `/api/usuarios/:id` | Perfil público |
| GET | `/api/usuarios/yo/recetas` | Mis aportes |
| PATCH | `/api/usuarios/yo` | Editar mi perfil |
| POST | `/api/usuarios/yo/portador` | Pasar de usuario a portador de saberes |
| POST | `/api/uploads` | Subir fotografía (campo `foto`) |

## Base de datos

El script sigue el **Diccionario de datos (10.2)**: tablas `usuario`, `receta`, `estado` y `comentario` con los mismos
campos, tipos y longitudes. La única columna adicional es `receta.urlImagen`, que el **Modelo E-R (10.1)** define como
`url_imagen`.

Los datos que pide el diseño y que no tienen columna propia se guardan así:

| Dato del diseño | Dónde se guarda |
|---|---|
| Ingredientes con cantidad y unidad | `receta.ingredientes` (TEXT) como JSON |
| Pasos, porciones, tiempo total, dificultad, tipo de platillo, región, municipio (nombre y clave INEGI), localidad, latitud/longitud, consejo e historia | `receta.preparacion` (TEXT) como JSON |
| Zona y texto de presentación de cada estado | `frontend/js/catalogos.js` (contenido fijo) |
| Favoritos y borradores | En el navegador de cada usuario (`localStorage`) |
| Foto de perfil, biografía | No se guardan; el perfil muestra las iniciales |
