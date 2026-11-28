-- =====================================================================
-- SIGEPA - Sistema Georreferenciado y Participativo para la Preservación
--          y Sustentabilidad del Patrimonio Gastronómico Mexicano
-- ESQUEMA RELACIONAL NORMALIZADO (3FN) — MySQL 8+, MariaDB 10.4+ o TiDB Cloud
--
-- 12 tablas:
--   Catálogos ........ tipo_usuario, estado, municipio, region, lengua, ingrediente
--   Entidades ........ usuario, receta
--   Dependientes ..... paso (composición 1:N de receta), comentario
--   Asociativas M:N .. receta_ingrediente, favorito
--
-- Diccionario de datos, modelo E-R y justificación de las formas normales:
-- docs/BASE_DE_DATOS.md
--
-- La API ejecuta este archivo sola la primera vez que arranca con una base
-- vacía. Para reiniciar a mano: cd backend && npm run db:reiniciar
-- =====================================================================

SET NAMES utf8mb4;

-- =====================================================================
-- CATÁLOGOS
-- =====================================================================

-- Roles del sistema (el diccionario pide "definir catálogo de roles").
CREATE TABLE tipo_usuario (
  idTipo       TINYINT       NOT NULL,
  nomTipo      VARCHAR(30)   NOT NULL,
  descripcion  VARCHAR(150)  NOT NULL,
  CONSTRAINT pk_tipo_usuario PRIMARY KEY (idTipo),
  CONSTRAINT uq_tipo_usuario_nombre UNIQUE (nomTipo)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- Entidades federativas. idEstado = clave de entidad del INEGI (1 a 32).
-- Las claves INEGI no cambian, por eso las llaves foráneas hacia estado usan ON UPDATE RESTRICT.
-- Ningún CHECK usa columnas de llaves foráneas: MySQL y TiDB no lo permiten cuando la llave
-- declara una acción referencial (ON UPDATE / ON DELETE).
CREATE TABLE estado (
  idEstado   TINYINT      NOT NULL,
  nomEstado  VARCHAR(20)  NOT NULL,
  CONSTRAINT pk_estado PRIMARY KEY (idEstado),
  CONSTRAINT uq_estado_nombre UNIQUE (nomEstado),
  CONSTRAINT ck_estado_clave CHECK (idEstado BETWEEN 1 AND 32)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- Municipios del Marco Geoestadístico del INEGI (2,475).
-- cveMun = clave geoestadística de 5 dígitos: 2 de la entidad + 3 del municipio.
CREATE TABLE municipio (
  cveMun        CHAR(5)      NOT NULL,
  idEstado      TINYINT      NOT NULL,
  nomMunicipio  VARCHAR(80)  NOT NULL,
  CONSTRAINT pk_municipio PRIMARY KEY (cveMun),
  CONSTRAINT fk_municipio_estado FOREIGN KEY (idEstado)
    REFERENCES estado (idEstado) ON UPDATE RESTRICT ON DELETE RESTRICT,
  -- Clave de 5 dígitos. Que los dos primeros coincidan con idEstado lo garantizan los datos del
  -- INEGI (datos.sql); no se valida aquí porque idEstado forma parte de una llave foránea.
  CONSTRAINT ck_municipio_clave CHECK (cveMun REGEXP '^[0-9]{5}$')
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
CREATE INDEX ix_municipio_estado ON municipio (idEstado);

-- Regiones culturales de cada estado (Valles Centrales, Huasteca, ...).
CREATE TABLE region (
  idRegion   INT          NOT NULL AUTO_INCREMENT,
  idEstado   TINYINT      NOT NULL,
  nomRegion  VARCHAR(60)  NOT NULL,
  CONSTRAINT pk_region PRIMARY KEY (idRegion),
  CONSTRAINT uq_region_estado_nombre UNIQUE (idEstado, nomRegion),
  CONSTRAINT fk_region_estado FOREIGN KEY (idEstado)
    REFERENCES estado (idEstado) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- Lenguas originarias en que se nombra un platillo.
CREATE TABLE lengua (
  idLengua   INT          NOT NULL AUTO_INCREMENT,
  nomLengua  VARCHAR(40)  NOT NULL,
  CONSTRAINT pk_lengua PRIMARY KEY (idLengua),
  CONSTRAINT uq_lengua_nombre UNIQUE (nomLengua)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- Ingredientes usados en las recetas (un nombre, una fila).
CREATE TABLE ingrediente (
  idIngrediente   INT          NOT NULL AUTO_INCREMENT,
  nomIngrediente  VARCHAR(80)  NOT NULL,
  CONSTRAINT pk_ingrediente PRIMARY KEY (idIngrediente),
  CONSTRAINT uq_ingrediente_nombre UNIQUE (nomIngrediente)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- =====================================================================
-- ENTIDADES PRINCIPALES
-- =====================================================================

CREATE TABLE usuario (
  idUs        INT           NOT NULL AUTO_INCREMENT,
  usuario     VARCHAR(40)   NOT NULL,
  contrasenia VARCHAR(255)  NOT NULL,              -- hash bcrypt, nunca texto plano
  nombre      VARCHAR(20)   NOT NULL,
  apPat       VARCHAR(20)   NOT NULL,
  apMat       VARCHAR(20)   NULL,
  tipoUsu     TINYINT       NOT NULL DEFAULT 2,
  email       VARCHAR(40)   NOT NULL,
  CONSTRAINT pk_usuario PRIMARY KEY (idUs),
  CONSTRAINT uq_usuario_usuario UNIQUE (usuario),
  CONSTRAINT uq_usuario_email UNIQUE (email),
  CONSTRAINT fk_usuario_tipo FOREIGN KEY (tipoUsu)
    REFERENCES tipo_usuario (idTipo) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT ck_usuario_email CHECK (email LIKE '%_@_%._%')
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- El estado de la receta se obtiene de su municipio (municipio -> estado);
-- no se repite aquí para evitar una dependencia transitiva (3FN).
CREATE TABLE receta (
  idReceta          INT                NOT NULL AUTO_INCREMENT,
  idUsuario         INT                NOT NULL,   -- portador(a) que la comparte
  cveMun            CHAR(5)            NOT NULL,   -- municipio de origen
  idRegion          INT                NULL,       -- región cultural (opcional)
  idLengua          INT                NULL,       -- lengua del nombre originario
  nombreReceta      VARCHAR(30)        NOT NULL,
  nombreLengua      VARCHAR(60)        NULL,
  descripcion       TEXT               NOT NULL,
  porciones         TINYINT UNSIGNED   NULL,
  tiempoTotal       SMALLINT UNSIGNED  NULL,       -- minutos
  dificultad        VARCHAR(10)        NULL,
  tipoPlatillo      VARCHAR(20)        NULL,
  localidad         VARCHAR(80)        NOT NULL,
  latitud           DECIMAL(8,5)       NULL,
  longitud          DECIMAL(8,5)       NULL,
  historia          TEXT               NULL,
  consejo           TEXT               NULL,
  urlImagen         VARCHAR(255)       NULL,       -- url_imagen del Modelo E-R
  licencia          VARCHAR(20)        NOT NULL DEFAULT 'saber-comunitario',
  consentimiento    BOOLEAN            NOT NULL DEFAULT FALSE,
  fechaRegistro     DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estadoValidacion  VARCHAR(20)        NOT NULL DEFAULT 'pendiente',
  CONSTRAINT pk_receta PRIMARY KEY (idReceta),
  CONSTRAINT fk_receta_usuario FOREIGN KEY (idUsuario)
    REFERENCES usuario (idUs) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_receta_municipio FOREIGN KEY (cveMun)
    REFERENCES municipio (cveMun) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_receta_region FOREIGN KEY (idRegion)
    REFERENCES region (idRegion) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_receta_lengua FOREIGN KEY (idLengua)
    REFERENCES lengua (idLengua) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT ck_receta_porciones   CHECK (porciones IS NULL OR porciones BETWEEN 1 AND 200),
  CONSTRAINT ck_receta_tiempo      CHECK (tiempoTotal IS NULL OR tiempoTotal BETWEEN 1 AND 4320),
  CONSTRAINT ck_receta_dificultad  CHECK (dificultad IS NULL OR dificultad IN ('Fácil', 'Intermedia', 'Avanzada')),
  CONSTRAINT ck_receta_tipo        CHECK (tipoPlatillo IS NULL OR tipoPlatillo IN (
    'Plato fuerte', 'Sopa o caldo', 'Antojito', 'Tamal', 'Salsa o mole', 'Guarnición', 'Postre', 'Bebida')),
  -- Las coordenadas van juntas y dentro del territorio nacional.
  CONSTRAINT ck_receta_coordenadas CHECK (
    (latitud IS NULL AND longitud IS NULL)
    OR (latitud BETWEEN 14 AND 33 AND longitud BETWEEN -119 AND -86)),
  CONSTRAINT ck_receta_licencia    CHECK (licencia IN ('saber-comunitario', 'cc-by-nc-sa')),
  CONSTRAINT ck_receta_validacion  CHECK (estadoValidacion IN ('pendiente', 'validada', 'rechazada')),
  -- Una receta solo puede publicarse con el consentimiento de su comunidad.
  CONSTRAINT ck_receta_consentimiento CHECK (estadoValidacion <> 'validada' OR consentimiento = TRUE)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
CREATE INDEX ix_receta_validacion ON receta (estadoValidacion, fechaRegistro);
CREATE INDEX ix_receta_municipio  ON receta (cveMun);
CREATE INDEX ix_receta_usuario    ON receta (idUsuario);
CREATE INDEX ix_receta_region     ON receta (idRegion);
CREATE INDEX ix_receta_lengua     ON receta (idLengua);

-- =====================================================================
-- DEPENDIENTES Y ASOCIATIVAS
-- =====================================================================

-- Ingredientes de cada receta (M:N receta–ingrediente con atributos).
CREATE TABLE receta_ingrediente (
  idReceta       INT               NOT NULL,
  idIngrediente  INT               NOT NULL,
  orden          TINYINT UNSIGNED  NOT NULL,
  cantidad       DECIMAL(8,2)      NULL,           -- NULL = "al gusto"
  unidad         VARCHAR(20)       NULL,
  nota           VARCHAR(60)       NULL,           -- "sin semillas", "en cubos"…
  CONSTRAINT pk_receta_ingrediente PRIMARY KEY (idReceta, idIngrediente),
  CONSTRAINT uq_receta_ingrediente_orden UNIQUE (idReceta, orden),
  CONSTRAINT fk_ri_receta FOREIGN KEY (idReceta)
    REFERENCES receta (idReceta) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_ri_ingrediente FOREIGN KEY (idIngrediente)
    REFERENCES ingrediente (idIngrediente) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT ck_ri_cantidad CHECK (cantidad IS NULL OR cantidad > 0),
  CONSTRAINT ck_ri_orden CHECK (orden >= 1)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
CREATE INDEX ix_ri_ingrediente ON receta_ingrediente (idIngrediente);

-- Pasos de preparación (composición: no existen sin su receta).
CREATE TABLE paso (
  idReceta  INT               NOT NULL,
  numPaso   TINYINT UNSIGNED  NOT NULL,
  titulo    VARCHAR(80)       NULL,
  texto     TEXT              NOT NULL,
  CONSTRAINT pk_paso PRIMARY KEY (idReceta, numPaso),
  CONSTRAINT fk_paso_receta FOREIGN KEY (idReceta)
    REFERENCES receta (idReceta) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT ck_paso_numero CHECK (numPaso >= 1)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

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
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
CREATE INDEX ix_comentario_receta ON comentario (idReceta, estadoComentario);
CREATE INDEX ix_comentario_usuario ON comentario (idUsuario);

-- Recetas que cada usuario guarda (M:N usuario–receta).
CREATE TABLE favorito (
  idUs           INT       NOT NULL,
  idReceta       INT       NOT NULL,
  fechaFavorito  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_favorito PRIMARY KEY (idUs, idReceta),
  CONSTRAINT fk_favorito_usuario FOREIGN KEY (idUs)
    REFERENCES usuario (idUs) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_favorito_receta FOREIGN KEY (idReceta)
    REFERENCES receta (idReceta) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
CREATE INDEX ix_favorito_receta ON favorito (idReceta);

-- =====================================================================
-- VISTAS
-- =====================================================================

-- Recetas validadas por estado (mapa principal).
CREATE VIEW v_recetas_por_estado AS
SELECT e.idEstado, e.nomEstado, COUNT(r.idReceta) AS totalRecetas
FROM estado e
LEFT JOIN municipio m ON m.idEstado = e.idEstado
LEFT JOIN receta r ON r.cveMun = m.cveMun AND r.estadoValidacion = 'validada'
GROUP BY e.idEstado, e.nomEstado;

-- Ficha de cada receta con su ubicación y autoría resueltas (reportes y consultas).
CREATE VIEW v_receta_ficha AS
SELECT r.idReceta, r.nombreReceta, r.estadoValidacion, r.fechaRegistro,
       e.idEstado, e.nomEstado, m.cveMun, m.nomMunicipio, r.localidad,
       g.nomRegion, l.nomLengua, r.nombreLengua,
       u.idUs AS idAutor, CONCAT(u.nombre, ' ', u.apPat) AS autor,
       (SELECT COUNT(*) FROM receta_ingrediente ri WHERE ri.idReceta = r.idReceta) AS totalIngredientes,
       (SELECT COUNT(*) FROM paso p WHERE p.idReceta = r.idReceta) AS totalPasos,
       (SELECT COUNT(*) FROM favorito f WHERE f.idReceta = r.idReceta) AS totalFavoritos
FROM receta r
JOIN municipio m ON m.cveMun = r.cveMun
JOIN estado e ON e.idEstado = m.idEstado
JOIN usuario u ON u.idUs = r.idUsuario
LEFT JOIN region g ON g.idRegion = r.idRegion
LEFT JOIN lengua l ON l.idLengua = r.idLengua;
