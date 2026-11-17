import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Entidades del Diccionario de datos (10.2) del documento de SIGEPA.
 * Tablas, columnas, tipos y longitudes son los del diccionario.
 * Única adición: Receta.urlImagen, que el Modelo E-R (10.1) define como "url_imagen".
 */

export enum TipoUsuario { ADMINISTRADOR = 1, REGULAR = 2 }
export type EstadoValidacion = 'pendiente' | 'validada' | 'rechazada';
export type EstadoComentario = 'publicado' | 'oculto' | 'eliminado';

/** Tabla Estado */
@Entity('estado')
export class Estado {
  @PrimaryGeneratedColumn({ name: 'idEstado' }) idEstado: number;
  @Column({ length: 20, unique: true }) nomEstado: string;
  @OneToMany(() => Receta, (r) => r.estado) recetas: Receta[];
}

/** Tabla Usuario */
@Entity('usuario')
export class Usuario {
  @PrimaryGeneratedColumn({ name: 'idUs' }) idUs: number;
  @Column({ length: 40, unique: true }) usuario: string;
  /** Hash bcrypt, nunca texto plano. */
  @Column({ length: 255, select: false }) contrasenia: string;
  @Column({ length: 20 }) nombre: string;
  @Column({ length: 20 }) apPat: string;
  @Column({ type: 'varchar', length: 20, nullable: true }) apMat: string | null;
  /** 1 = administrador, 2 = usuario regular */
  @Column({ type: 'int', default: TipoUsuario.REGULAR }) tipoUsu: TipoUsuario;
  @Column({ length: 40, unique: true }) email: string;
  @OneToMany(() => Receta, (r) => r.usuario) recetas: Receta[];
}

/** Tabla Receta */
@Entity('receta')
export class Receta {
  @PrimaryGeneratedColumn({ name: 'idReceta' }) idReceta: number;
  @Column() idUsuario: number;
  @Column() idEstado: number;
  @Column({ length: 30 }) nombreReceta: string;
  @Column({ type: 'text', nullable: true }) descripcion: string | null;
  /** TEXT. La API guarda la lista como JSON: [{cantidad, unidad, nombre}]. */
  @Column({ type: 'text', nullable: true }) ingredientes: string | null;
  /** TEXT. La API guarda el procedimiento como JSON: pasos y datos de preparación (ver recetas.ts). */
  @Column({ type: 'text', nullable: true }) preparacion: string | null;
  @CreateDateColumn({ type: 'datetime' }) fechaRegistro: Date;
  @Column({ length: 20, default: 'pendiente' }) estadoValidacion: EstadoValidacion;
  /** url_imagen del Modelo E-R (10.1). */
  @Column({ type: 'varchar', length: 255, nullable: true }) urlImagen: string | null;

  @ManyToOne(() => Usuario, (u) => u.recetas) @JoinColumn({ name: 'idUsuario' }) usuario: Usuario;
  @ManyToOne(() => Estado, (e) => e.recetas) @JoinColumn({ name: 'idEstado' }) estado: Estado;
  @OneToMany(() => Comentario, (c) => c.receta) comentarios: Comentario[];
}

/** Tabla Comentario */
@Entity('comentario')
export class Comentario {
  @PrimaryGeneratedColumn({ name: 'idComentario' }) idComentario: number;
  @Column() idReceta: number;
  @Column() idUsuario: number;
  @Column({ type: 'text' }) comentario: string;
  @CreateDateColumn({ type: 'datetime' }) fechaComentario: Date;
  @Column({ length: 20, default: 'publicado' }) estadoComentario: EstadoComentario;
  @ManyToOne(() => Receta, (r) => r.comentarios, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'idReceta' }) receta: Receta;
  @ManyToOne(() => Usuario) @JoinColumn({ name: 'idUsuario' }) usuario: Usuario;
}

export const ENTITIES = [Estado, Usuario, Receta, Comentario];
