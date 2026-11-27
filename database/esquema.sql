-- =====================================================================
-- SIGEPA - Sistema Georreferenciado y Participativo para la Preservación
--          y Sustentabilidad del Patrimonio Gastronómico Mexicano
-- ESQUEMA (MySQL 8+, MariaDB 10.4+ o TiDB Cloud)
--
-- Tablas y columnas según el Diccionario de datos (10.2) del documento.
-- Única adición: receta.urlImagen ("url_imagen" del Modelo E-R 10.1).
--
-- Las columnas TEXT ingredientes y preparacion guardan JSON escrito por la
-- API (ver backend/src/modulos/recetas/receta.formato.ts).
--
-- La API ejecuta este archivo sola la primera vez que arranca con una base
-- vacía. Para reiniciar a mano: cd backend && npm run db:reiniciar
-- =====================================================================

SET NAMES utf8mb4;

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
-- tipoUsu (catálogo de roles):
--   1 = administrador (valida recetas y modera comentarios)
--   2 = usuario (valor predeterminado): explora, guarda favoritos y comenta
--   3 = portador de saberes: además publica recetas de su comunidad
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
  CONSTRAINT ck_usuario_tipo CHECK (tipoUsu IN (1, 2, 3))
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
