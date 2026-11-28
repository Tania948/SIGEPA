import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Receta } from './receta.entity';
import { EstadoComentario } from './tipos';
import { Usuario } from './usuario.entity';

/** Tabla comentario. */
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
