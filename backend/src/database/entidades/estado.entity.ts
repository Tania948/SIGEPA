import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { Municipio } from './municipio.entity';

/** Catálogo estado. idEstado = clave de entidad del INEGI (1 a 32). */
@Entity('estado')
export class Estado {
  @PrimaryColumn({ type: 'tinyint' }) idEstado: number;
  @Column({ length: 20, unique: true }) nomEstado: string;
  @OneToMany(() => Municipio, (m) => m.estado) municipios: Municipio[];
}
