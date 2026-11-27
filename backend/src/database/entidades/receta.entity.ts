import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Comentario } from './comentario.entity';
import { Estado } from './estado.entity';
import { EstadoValidacion } from './tipos';
import { Usuario } from './usuario.entity';

/**
 * Tabla Receta (diccionario de datos 10.2). Única adición: urlImagen ("url_imagen" del Modelo E-R 10.1).
 * ingredientes y preparacion son TEXT; la API guarda JSON en ellas (ver modulos/recetas/receta.formato.ts).
 */
@Entity('receta')
export class Receta {
  @PrimaryGeneratedColumn({ name: 'idReceta' }) idReceta: number;
  @Column() idUsuario: number;
  @Column() idEstado: number;
  @Column({ length: 30 }) nombreReceta: string;
  @Column({ type: 'text', nullable: true }) descripcion: string | null;
  @Column({ type: 'text', nullable: true }) ingredientes: string | null;
  @Column({ type: 'text', nullable: true }) preparacion: string | null;
  @CreateDateColumn({ type: 'datetime' }) fechaRegistro: Date;
  @Column({ length: 20, default: 'pendiente' }) estadoValidacion: EstadoValidacion;
  @Column({ type: 'varchar', length: 255, nullable: true }) urlImagen: string | null;

  @ManyToOne(() => Usuario, (u) => u.recetas) @JoinColumn({ name: 'idUsuario' }) usuario: Usuario;
  @ManyToOne(() => Estado, (e) => e.recetas) @JoinColumn({ name: 'idEstado' }) estado: Estado;
  @OneToMany(() => Comentario, (c) => c.receta) comentarios: Comentario[];
}
