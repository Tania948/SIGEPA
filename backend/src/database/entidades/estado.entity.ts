import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Receta } from './receta.entity';

/** Tabla Estado (diccionario de datos 10.2). idEstado coincide con la clave INEGI de la entidad. */
@Entity('estado')
export class Estado {
  @PrimaryGeneratedColumn({ name: 'idEstado' }) idEstado: number;
  @Column({ length: 20, unique: true }) nomEstado: string;
  @OneToMany(() => Receta, (r) => r.estado) recetas: Receta[];
}
