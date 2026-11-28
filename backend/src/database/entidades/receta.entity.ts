import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Comentario } from './comentario.entity';
import { Lengua } from './lengua.entity';
import { Municipio } from './municipio.entity';
import { Paso } from './paso.entity';
import { RecetaIngrediente } from './receta-ingrediente.entity';
import { Region } from './region.entity';
import { EstadoValidacion } from './tipos';
import { Usuario } from './usuario.entity';

/**
 * Tabla receta (3FN). El estado no se guarda aquí: se obtiene de municipio -> estado.
 * Ingredientes y pasos viven en sus propias tablas (receta_ingrediente, paso).
 */
@Entity('receta')
export class Receta {
  @PrimaryGeneratedColumn({ name: 'idReceta' }) idReceta: number;
  @Column() idUsuario: number;
  @Column({ type: 'char', length: 5 }) cveMun: string;
  @Column({ type: 'int', nullable: true }) idRegion: number | null;
  @Column({ type: 'int', nullable: true }) idLengua: number | null;
  @Column({ length: 30 }) nombreReceta: string;
  @Column({ type: 'varchar', length: 60, nullable: true }) nombreLengua: string | null;
  @Column({ type: 'text' }) descripcion: string;
  @Column({ type: 'tinyint', unsigned: true, nullable: true }) porciones: number | null;
  @Column({ type: 'smallint', unsigned: true, nullable: true }) tiempoTotal: number | null;
  @Column({ type: 'varchar', length: 10, nullable: true }) dificultad: string | null;
  @Column({ type: 'varchar', length: 20, nullable: true }) tipoPlatillo: string | null;
  @Column({ length: 80 }) localidad: string;
  @Column({ type: 'decimal', precision: 8, scale: 5, nullable: true }) latitud: string | null;
  @Column({ type: 'decimal', precision: 8, scale: 5, nullable: true }) longitud: string | null;
  @Column({ type: 'text', nullable: true }) historia: string | null;
  @Column({ type: 'text', nullable: true }) consejo: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) urlImagen: string | null;
  @Column({ length: 20, default: 'saber-comunitario' }) licencia: string;
  @Column({ type: 'boolean', default: false }) consentimiento: boolean;
  @CreateDateColumn({ type: 'datetime' }) fechaRegistro: Date;
  @Column({ length: 20, default: 'pendiente' }) estadoValidacion: EstadoValidacion;

  @ManyToOne(() => Usuario, (u) => u.recetas) @JoinColumn({ name: 'idUsuario' }) usuario: Usuario;
  @ManyToOne(() => Municipio) @JoinColumn({ name: 'cveMun' }) municipio: Municipio;
  @ManyToOne(() => Region) @JoinColumn({ name: 'idRegion' }) region: Region | null;
  @ManyToOne(() => Lengua) @JoinColumn({ name: 'idLengua' }) lengua: Lengua | null;
  @OneToMany(() => RecetaIngrediente, (ri) => ri.receta) ingredientes: RecetaIngrediente[];
  @OneToMany(() => Paso, (p) => p.receta) pasos: Paso[];
  @OneToMany(() => Comentario, (c) => c.receta) comentarios: Comentario[];
}
