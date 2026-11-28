import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Estado } from './estado.entity';

/** Catálogo region: regiones culturales de cada estado. */
@Entity('region')
@Unique('uq_region_estado_nombre', ['idEstado', 'nomRegion'])
export class Region {
  @PrimaryGeneratedColumn() idRegion: number;
  @Column({ type: 'tinyint' }) idEstado: number;
  @Column({ length: 60 }) nomRegion: string;
  @ManyToOne(() => Estado) @JoinColumn({ name: 'idEstado' }) estado: Estado;
}
