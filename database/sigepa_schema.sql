-- =====================================================================
-- SIGEPA - Sistema Georreferenciado y Participativo para la Preservación
--          y Sustentabilidad del Patrimonio Gastronómico Mexicano
-- Script de base de datos (MySQL 8+ / MariaDB 10.4+)
--
-- Tablas y columnas según el Diccionario de datos (10.2) del documento.
-- Única adición: receta.urlImagen, definida como "url_imagen" en el
-- Modelo Entidad-Relación (10.1).
--
-- Las columnas TEXT ingredientes y preparacion guardan JSON escrito por la
-- API (lista de ingredientes; pasos y datos de preparación como porciones,
-- tiempo, dificultad, región y localidad). Ver backend/src/recetas/recetas.ts.
-- =====================================================================

SET NAMES utf8mb4;
DROP DATABASE IF EXISTS sigepa;
CREATE DATABASE sigepa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sigepa;

-- ---------------------------------------------------------------------
-- Tabla Estado: entidades federativas (relación "Están" con Receta)
-- ---------------------------------------------------------------------
CREATE TABLE estado (
  idEstado   INT          NOT NULL AUTO_INCREMENT,
  nomEstado  VARCHAR(20)  NOT NULL,
  CONSTRAINT pk_estado PRIMARY KEY (idEstado),
  CONSTRAINT uq_estado_nombre UNIQUE (nomEstado)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Tabla Usuario
-- tipoUsu: 1 = administrador, 2 = usuario regular (valor predeterminado)
-- contrasenia: se guarda el hash, no texto plano
-- ---------------------------------------------------------------------
CREATE TABLE usuario (
  idUs        INT           NOT NULL AUTO_INCREMENT,
  usuario     VARCHAR(40)   NOT NULL,
  contrasenia VARCHAR(255)  NOT NULL,
  nombre      VARCHAR(20)   NOT NULL,
  apPat       VARCHAR(20)   NOT NULL,
  apMat       VARCHAR(20)   NULL,
  tipoUsu     INT           NOT NULL DEFAULT 2,
  email       VARCHAR(40)   NOT NULL,
  CONSTRAINT pk_usuario PRIMARY KEY (idUs),
  CONSTRAINT uq_usuario_usuario UNIQUE (usuario),
  CONSTRAINT uq_usuario_email UNIQUE (email),
  CONSTRAINT ck_usuario_tipo CHECK (tipoUsu IN (1, 2))
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Tabla Receta (relaciones "Hacen" con Usuario y "Están" con Estado)
-- ---------------------------------------------------------------------
CREATE TABLE receta (
  idReceta          INT           NOT NULL AUTO_INCREMENT,
  idUsuario         INT           NOT NULL,
  idEstado          INT           NOT NULL,
  nombreReceta      VARCHAR(30)   NOT NULL,
  descripcion       TEXT          NULL,
  ingredientes      TEXT          NULL,
  preparacion       TEXT          NULL,
  fechaRegistro     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estadoValidacion  VARCHAR(20)   NOT NULL DEFAULT 'pendiente',
  urlImagen         VARCHAR(255)  NULL,   -- url_imagen del Modelo E-R (10.1)
  CONSTRAINT pk_receta PRIMARY KEY (idReceta),
  CONSTRAINT fk_receta_usuario FOREIGN KEY (idUsuario)
    REFERENCES usuario (idUs) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_receta_estado FOREIGN KEY (idEstado)
    REFERENCES estado (idEstado) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT ck_receta_validacion
    CHECK (estadoValidacion IN ('pendiente', 'validada', 'rechazada'))
) ENGINE = InnoDB;

CREATE INDEX ix_receta_estado  ON receta (idEstado, estadoValidacion);
CREATE INDEX ix_receta_usuario ON receta (idUsuario);

-- ---------------------------------------------------------------------
-- Tabla Comentario (relaciones con Usuario y con Receta)
-- ---------------------------------------------------------------------
CREATE TABLE comentario (
  idComentario      INT          NOT NULL AUTO_INCREMENT,
  idReceta          INT          NOT NULL,
  idUsuario         INT          NOT NULL,
  comentario        TEXT         NOT NULL,
  fechaComentario   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estadoComentario  VARCHAR(20)  NOT NULL DEFAULT 'publicado',
  CONSTRAINT pk_comentario PRIMARY KEY (idComentario),
  CONSTRAINT fk_comentario_receta FOREIGN KEY (idReceta)
    REFERENCES receta (idReceta) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_comentario_usuario FOREIGN KEY (idUsuario)
    REFERENCES usuario (idUs) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT ck_comentario_estado
    CHECK (estadoComentario IN ('publicado', 'oculto', 'eliminado'))
) ENGINE = InnoDB;

CREATE INDEX ix_comentario_receta ON comentario (idReceta, estadoComentario);

-- ---------------------------------------------------------------------
-- Vista de apoyo para el mapa: recetas validadas por estado
-- ---------------------------------------------------------------------
CREATE VIEW v_recetas_por_estado AS
SELECT e.idEstado, e.nomEstado, COUNT(r.idReceta) AS totalRecetas
FROM estado e
LEFT JOIN receta r ON r.idEstado = e.idEstado AND r.estadoValidacion = 'validada'
GROUP BY e.idEstado, e.nomEstado;

-- =====================================================================
-- DATOS INICIALES
-- =====================================================================

INSERT INTO estado (nomEstado) VALUES
 ('Aguascalientes'),
 ('Baja California'),
 ('Baja California Sur'),
 ('Campeche'),
 ('Chiapas'),
 ('Chihuahua'),
 ('Ciudad de México'),
 ('Coahuila'),
 ('Colima'),
 ('Durango'),
 ('Guanajuato'),
 ('Guerrero'),
 ('Hidalgo'),
 ('Jalisco'),
 ('Estado de México'),
 ('Michoacán'),
 ('Morelos'),
 ('Nayarit'),
 ('Nuevo León'),
 ('Oaxaca'),
 ('Puebla'),
 ('Querétaro'),
 ('Quintana Roo'),
 ('San Luis Potosí'),
 ('Sinaloa'),
 ('Sonora'),
 ('Tabasco'),
 ('Tamaulipas'),
 ('Tlaxcala'),
 ('Veracruz'),
 ('Yucatán'),
 ('Zacatecas');

-- Contraseña de todas las cuentas de ejemplo: Sigepa2026 (se guarda solo el hash bcrypt)
INSERT INTO usuario (usuario, contrasenia, nombre, apPat, apMat, tipoUsu, email) VALUES
 ('admin',          '$2a$10$tZK9REmg.lxTv0IagsKC4./Nb8JSuJOC0wAs.f3tkU37We.wdEtoy', 'Equipo', 'SIGEPA',    NULL, 1, 'admin@sigepa.mx'),
 ('elena.martinez', '$2a$10$tZK9REmg.lxTv0IagsKC4./Nb8JSuJOC0wAs.f3tkU37We.wdEtoy', 'Elena',  'Martínez',  NULL, 2, 'elena.martinez@correo.mx'),
 ('ana.lopez',      '$2a$10$tZK9REmg.lxTv0IagsKC4./Nb8JSuJOC0wAs.f3tkU37We.wdEtoy', 'Ana',    'López',     NULL, 2, 'ana.lopez@correo.mx'),
 ('lucia.hernandez','$2a$10$tZK9REmg.lxTv0IagsKC4./Nb8JSuJOC0wAs.f3tkU37We.wdEtoy', 'Lucía',  'Hernández', NULL, 2, 'lucia.hernandez@correo.mx'),
 ('maria.pech',     '$2a$10$tZK9REmg.lxTv0IagsKC4./Nb8JSuJOC0wAs.f3tkU37We.wdEtoy', 'María',  'Pech',      NULL, 2, 'maria.pech@correo.mx');

-- ingredientes y preparacion son TEXT (diccionario); la API guarda en ellos JSON.
INSERT INTO receta (idUsuario, idEstado, nombreReceta, descripcion, ingredientes, preparacion,
                    estadoValidacion, urlImagen, fechaRegistro) VALUES
 (2, 20, 'Mole amarillo de pollo',
  'Un mole de cazuela, con el aroma de la hierba santa y la textura suave de la masa. Así lo preparamos en mi casa para compartir a la hora de la comida.',
  '[{"cantidad": "700", "unidad": "g", "nombre": "pollo en piezas"}, {"cantidad": "4", "unidad": "piezas", "nombre": "chiles guajillo, sin semillas"}, {"cantidad": "300", "unidad": "g", "nombre": "jitomate"}, {"cantidad": "200", "unidad": "g", "nombre": "tomate verde, sin cáscara"}, {"cantidad": "½", "unidad": "pieza", "nombre": "cebolla blanca"}, {"cantidad": "2", "unidad": "dientes", "nombre": "ajo"}, {"cantidad": "1", "unidad": "pieza", "nombre": "chayote, en cubos"}, {"cantidad": "150", "unidad": "g", "nombre": "ejotes, sin puntas"}, {"cantidad": "80", "unidad": "g", "nombre": "masa de maíz nixtamalizado"}, {"cantidad": "1", "unidad": "litro", "nombre": "caldo de pollo"}, {"cantidad": "1", "unidad": "hoja", "nombre": "hierba santa"}, {"cantidad": "2", "unidad": "cucharadas", "nombre": "aceite vegetal"}, {"cantidad": "¼", "unidad": "cucharadita", "nombre": "comino molido"}, {"cantidad": "1", "unidad": "pizca", "nombre": "clavo molido"}, {"cantidad": "Al gusto", "unidad": "", "nombre": "sal"}]',
  '{"pasos": [{"titulo": "Prepara los ingredientes", "texto": "Lava los vegetales. Corta el chayote en cubos de 2 cm y los ejotes a la mitad. Retira tallos, semillas y venas de los chiles; tuéstalos unos segundos por lado en un comal, sin quemarlos. Remójalos 15 minutos en agua caliente."}, {"titulo": "Cuece el pollo y las verduras", "texto": "Pon el pollo en una olla con el litro de caldo. Lleva a hervor suave y cocina tapado de 30 a 35 minutos. Agrega el chayote cuando hayan pasado 15 minutos y los ejotes en los últimos 10 minutos. El pollo debe quedar bien cocido; si usas termómetro, el centro debe alcanzar 74 °C. Reserva el caldo."}, {"titulo": "Muele la base del mole", "texto": "Mientras se cuece el pollo, asa el jitomate, el tomate verde, la cebolla y el ajo en el comal hasta que se suavicen. Licúa con los chiles escurridos, el comino, el clavo y una taza del caldo de cocción. Cuela para obtener una salsa tersa."}, {"titulo": "Sazona la salsa", "texto": "Calienta el aceite en una cazuela a fuego medio. Vierte la salsa con cuidado y cocina de 8 a 10 minutos, moviendo para que no se pegue. Añade poco a poco el resto del caldo reservado y mezcla."}, {"titulo": "Espesa con la masa", "texto": "Disuelve la masa en ½ taza de agua hasta que no tenga grumos. Incorpórala en un hilo a la salsa mientras mueves. Agrega la hoja de hierba santa y cocina a fuego bajo de 8 a 10 minutos. Si espesa demasiado, añade un poco de agua caliente."}, {"titulo": "Integra y sirve", "texto": "Devuelve el pollo, el chayote y los ejotes a la cazuela. Cocina todo junto 5 minutos y ajusta la sal. Retira la hoja de hierba santa. Sirve caliente con tortillas de maíz recién hechas."}], "porciones": 4, "tiempoTotal": 60, "dificultad": "Intermedia", "tipoPlatillo": "Plato fuerte", "region": "Valles Centrales", "localidad": "San Pablo Villa de Mitla", "latitud": 16.9214, "longitud": -96.3594, "consejo": "Agrega la masa poco a poco y no dejes de mover. El amarillo debe quedar ligero, no como un atole espeso.", "historia": "Aprendí a preparar este amarillo acompañando a mi mamá al mercado de Mitla. Ella elegía los ejotes tiernos y siempre guardaba una hoja de hierba santa para la cazuela. En nuestra casa lo comemos con tortillas; a veces cambiamos las verduras por las que hay en temporada.", "pieFoto": "Una versión familiar con pollo, chayote, ejotes y hierba santa."}',
  'validada', '/assets/img/mole-amarillo-servido.jpg', NOW() - INTERVAL 1 DAY),
 (2, 20, 'Tlayudas con tasajo',
  'Tortilla grande y crujiente untada con asiento y frijol, con quesillo y tasajo asado a las brasas. Es la cena de los sábados en la casa.',
  '[{"cantidad": "4", "unidad": "piezas", "nombre": "tlayudas"}, {"cantidad": "400", "unidad": "g", "nombre": "tasajo"}, {"cantidad": "250", "unidad": "g", "nombre": "quesillo"}, {"cantidad": "1", "unidad": "taza", "nombre": "frijoles negros refritos"}, {"cantidad": "4", "unidad": "cucharadas", "nombre": "asiento de cerdo"}, {"cantidad": "1", "unidad": "pieza", "nombre": "aguacate"}, {"cantidad": "Al gusto", "unidad": "", "nombre": "salsa de chile pasilla"}]',
  '{"pasos": [{"titulo": "Asa el tasajo", "texto": "Asa el tasajo a las brasas o en un comal muy caliente y córtalo en tiras."}, {"titulo": "Unta la tlayuda", "texto": "Unta asiento y una capa delgada de frijol sobre cada tlayuda."}, {"titulo": "Agrega el relleno", "texto": "Reparte el quesillo deshebrado y el tasajo; dobla la tlayuda por la mitad."}, {"titulo": "Dora y sirve", "texto": "Calienta en el comal o sobre las brasas hasta que dore. Sirve con aguacate y salsa."}], "porciones": 4, "tiempoTotal": 35, "dificultad": "Fácil", "tipoPlatillo": "Antojito", "region": "Valles Centrales", "localidad": "Oaxaca de Juárez", "latitud": 17.0732, "longitud": -96.7266}',
  'validada', '/assets/img/tlayudas.jpg', NOW() - INTERVAL 2 DAY),
 (2, 20, 'Tamales de mole negro',
  'Tamales envueltos en hoja de plátano, rellenos de pollo y mole negro. Se preparan para las fiestas y se comparten entre vecinos.',
  '[{"cantidad": "1", "unidad": "kg", "nombre": "masa para tamal"}, {"cantidad": "500", "unidad": "g", "nombre": "mole negro"}, {"cantidad": "500", "unidad": "g", "nombre": "pollo cocido y deshebrado"}, {"cantidad": "250", "unidad": "g", "nombre": "manteca de cerdo"}, {"cantidad": "2", "unidad": "tazas", "nombre": "caldo de pollo"}, {"cantidad": "10", "unidad": "piezas", "nombre": "hojas de plátano"}]',
  '{"pasos": [{"titulo": "Bate la masa", "texto": "Bate la manteca hasta que esponje y agrega la masa y el caldo poco a poco."}, {"titulo": "Prepara las hojas", "texto": "Asa las hojas de plátano para suavizarlas y córtalas en cuadros."}, {"titulo": "Arma los tamales", "texto": "Extiende masa, agrega mole y pollo, y envuelve."}, {"titulo": "Cuece al vapor", "texto": "Cuece en vaporera durante una hora y media, hasta que la masa se despegue de la hoja."}], "porciones": 10, "tiempoTotal": 120, "dificultad": "Intermedia", "tipoPlatillo": "Tamal", "region": "Valles Centrales", "localidad": "Teotitlán del Valle", "latitud": 17.0303, "longitud": -96.5196}',
  'validada', '/assets/img/tamales-mole-negro.jpg', NOW() - INTERVAL 3 DAY),
 (4, 14, 'Pozole rojo de casa',
  'Caldo de maíz pozolero con carne de cerdo y chile guajillo, servido con rábano, lechuga, orégano y limón.',
  '[{"cantidad": "1", "unidad": "kg", "nombre": "maíz pozolero"}, {"cantidad": "1", "unidad": "kg", "nombre": "carne de cerdo"}, {"cantidad": "6", "unidad": "piezas", "nombre": "chiles guajillo"}, {"cantidad": "1", "unidad": "pieza", "nombre": "cebolla"}, {"cantidad": "3", "unidad": "dientes", "nombre": "ajo"}, {"cantidad": "Al gusto", "unidad": "", "nombre": "rábano, lechuga y orégano"}]',
  '{"pasos": [{"titulo": "Cuece el maíz", "texto": "Cuece el maíz hasta que floree."}, {"titulo": "Agrega la carne", "texto": "Cuece la carne aparte con cebolla y ajo, y agrégala al maíz."}, {"titulo": "Prepara el chile", "texto": "Licúa los chiles remojados con ajo y cuela sobre la olla."}, {"titulo": "Sirve", "texto": "Sirve caliente con rábano, lechuga, orégano y limón."}], "porciones": 8, "tiempoTotal": 90, "dificultad": "Intermedia", "tipoPlatillo": "Sopa o caldo", "localidad": "Guadalajara"}',
  'validada', '/assets/img/pozole.jpg', NOW() - INTERVAL 4 DAY),
 (5, 31, 'Sopa de lima',
  'Caldo yucateco de pollo con lima agria y tiras de tortilla frita. En mi familia se sirve los domingos.',
  '[{"cantidad": "1", "unidad": "pieza", "nombre": "pechuga de pollo"}, {"cantidad": "4", "unidad": "piezas", "nombre": "limas"}, {"cantidad": "6", "unidad": "piezas", "nombre": "tortillas de maíz"}, {"cantidad": "1", "unidad": "pieza", "nombre": "chile xcatic"}, {"cantidad": "1", "unidad": "pieza", "nombre": "jitomate"}, {"cantidad": "½", "unidad": "pieza", "nombre": "cebolla morada"}]',
  '{"pasos": [{"titulo": "Cuece el pollo", "texto": "Cuece el pollo con especias y deshébralo."}, {"titulo": "Sofríe la base", "texto": "Sofríe cebolla, chile y jitomate y agrega el caldo."}, {"titulo": "Perfuma con lima", "texto": "Añade jugo y rodajas de lima al final, sin dejar que hierva."}, {"titulo": "Sirve", "texto": "Sirve con tiras de tortilla frita."}], "porciones": 4, "tiempoTotal": 45, "dificultad": "Fácil", "tipoPlatillo": "Sopa o caldo", "localidad": "Mérida"}',
  'validada', '/assets/img/sopa-de-lima.jpg', NOW() - INTERVAL 5 DAY),
 (5, 31, 'Cochinita pibil',
  'Cerdo marinado en recado rojo y naranja agria, cocido lentamente en hoja de plátano.',
  '[{"cantidad": "1.5", "unidad": "kg", "nombre": "pierna de cerdo"}, {"cantidad": "100", "unidad": "g", "nombre": "recado rojo (achiote)"}, {"cantidad": "1", "unidad": "taza", "nombre": "jugo de naranja agria"}, {"cantidad": "4", "unidad": "piezas", "nombre": "hojas de plátano"}, {"cantidad": "1", "unidad": "pieza", "nombre": "cebolla morada encurtida"}]',
  '{"pasos": [{"titulo": "Marina", "texto": "Disuelve el recado en el jugo de naranja y marina la carne toda la noche."}, {"titulo": "Envuelve", "texto": "Envuelve la carne en hojas de plátano asadas."}, {"titulo": "Cocina lento", "texto": "Hornea tapado a fuego bajo durante tres horas o cocina en pib."}, {"titulo": "Deshebra y sirve", "texto": "Deshebra y sirve con cebolla morada y tortillas."}], "porciones": 8, "tiempoTotal": 180, "dificultad": "Intermedia", "tipoPlatillo": "Plato fuerte", "localidad": "Mérida"}',
  'validada', '/assets/img/cochinita-pibil.jpg', NOW() - INTERVAL 6 DAY),
 (3, 20, 'Memelas con frijol y queso',
  'Memelas de masa recién hecha con asiento, frijol y queso fresco, como las del mercado de Tlacolula.',
  '[{"cantidad": "500", "unidad": "g", "nombre": "masa de maíz"}, {"cantidad": "1", "unidad": "taza", "nombre": "frijoles negros refritos"}, {"cantidad": "3", "unidad": "cucharadas", "nombre": "asiento de cerdo"}, {"cantidad": "150", "unidad": "g", "nombre": "queso fresco"}, {"cantidad": "Al gusto", "unidad": "", "nombre": "salsa roja"}]',
  '{"pasos": [{"titulo": "Forma las memelas", "texto": "Forma tortillas gruesas y pellizca la orilla para hacer un borde."}, {"titulo": "Cuécelas", "texto": "Cuécelas en el comal por ambos lados."}, {"titulo": "Unta y sirve", "texto": "Unta asiento y frijol, agrega queso y salsa."}], "porciones": 4, "tiempoTotal": 30, "dificultad": "Fácil", "tipoPlatillo": "Antojito", "region": "Valles Centrales", "localidad": "Tlacolula de Matamoros", "latitud": 16.953, "longitud": -96.476}',
  'validada', '/assets/img/memelas.jpg', NOW() - INTERVAL 7 DAY),
 (3, 20, 'Calabacitas con elote',
  'Guisado sencillo de la milpa: calabacitas, elote, jitomate y queso fresco.',
  '[{"cantidad": "4", "unidad": "piezas", "nombre": "calabacitas"}, {"cantidad": "2", "unidad": "piezas", "nombre": "elotes desgranados"}, {"cantidad": "2", "unidad": "piezas", "nombre": "jitomates"}, {"cantidad": "½", "unidad": "pieza", "nombre": "cebolla"}, {"cantidad": "100", "unidad": "g", "nombre": "queso fresco"}]',
  '{"pasos": [{"titulo": "Sofríe", "texto": "Sofríe la cebolla y el jitomate picados."}, {"titulo": "Cocina", "texto": "Agrega el elote y las calabacitas en cubos; tapa y cocina 15 minutos."}, {"titulo": "Termina", "texto": "Ajusta la sal y sirve con queso fresco desmoronado."}], "porciones": 4, "tiempoTotal": 35, "dificultad": "Fácil", "tipoPlatillo": "Guarnición", "region": "Valles Centrales", "localidad": "Tlacolula de Matamoros", "latitud": 16.953, "longitud": -96.476}',
  'validada', '/assets/img/calabacitas-con-elote.jpg', NOW() - INTERVAL 8 DAY),
 (3, 20, 'Sopa de guías de calabaza',
  'En mi familia preparamos esta sopa cuando encontramos guías tiernas en el mercado de Tlacolula. Aprovechamos las hojas, los tallos suaves y las flores de la calabaza, junto con el elote de temporada. Es una receta sencilla que aprendí con mi abuela.',
  '[{"cantidad": "200", "unidad": "g", "nombre": "guías tiernas de calabaza"}, {"cantidad": "2", "unidad": "piezas", "nombre": "calabacitas"}, {"cantidad": "2", "unidad": "piezas", "nombre": "elotes tiernos"}, {"cantidad": "1.5", "unidad": "litros", "nombre": "agua"}, {"cantidad": "2", "unidad": "dientes", "nombre": "ajo"}, {"cantidad": "¼", "unidad": "pieza", "nombre": "cebolla blanca"}, {"cantidad": "2", "unidad": "ramitas", "nombre": "chepiche"}, {"cantidad": "Al gusto", "unidad": "", "nombre": "sal"}]',
  '{"pasos": [{"titulo": "", "texto": "Lava las guías, retira las fibras duras de los tallos y corta los brotes tiernos en trozos. Lava las flores y las calabacitas."}, {"titulo": "", "texto": "Corta los elotes en rodajas y las calabacitas en trozos medianos. Pon a hervir el agua con la cebolla y los dientes de ajo."}, {"titulo": "", "texto": "Añade los elotes y cuece a fuego medio durante 20 minutos o hasta que los granos estén tiernos."}, {"titulo": "", "texto": "Incorpora las guías y las calabacitas. Cocina 10 minutos más. Agrega las flores y el chepiche en los últimos 3 minutos."}, {"titulo": "", "texto": "Sazona con sal, retira la cebolla y el ajo si lo deseas y sirve caliente. Acompaña con tortillas de maíz."}], "porciones": 4, "tiempoTotal": 45, "dificultad": "Fácil", "tipoPlatillo": "Sopa o caldo", "region": "Valles Centrales", "localidad": "Tlacolula de Matamoros", "latitud": 16.953, "longitud": -96.476}',
  'pendiente', '/assets/img/sopa-de-guias.jpg', NOW() - INTERVAL 9 DAY);

INSERT INTO comentario (idReceta, idUsuario, comentario) VALUES
 (1, 3, 'Lo preparé el domingo con la hoja santa del mercado y quedó delicioso. ¡Gracias por compartirlo!');
