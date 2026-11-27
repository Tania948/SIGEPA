import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Estado } from './estado.entity';

/** Catálogo municipio (Marco Geoestadístico del INEGI). cveMun = 2 dígitos de entidad + 3 de municipio. */
@Entity('municipio')
export class Municipio {
  @PrimaryColumn({ type: 'char', length: 5 }) cveMun: string;
  @Column({ type: 'tinyint' }) idEstado: number;
  @Column({ length: 80 }) nomMunicipio: string;
  @ManyToOne(() => Estado, (e) => e.municipios) @JoinColumn({ name: 'idEstado' }) estado: Estado;
}
