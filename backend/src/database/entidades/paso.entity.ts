import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Receta } from './receta.entity';

/** Paso de preparación (composición 1:N con receta). PK compuesta (idReceta, numPaso). */
@Entity('paso')
export class Paso {
  @PrimaryColumn() idReceta: number;
  @PrimaryColumn({ type: 'tinyint', unsigned: true }) numPaso: number;
  @Column({ type: 'varchar', length: 80, nullable: true }) titulo: string | null;
  @Column({ type: 'text' }) texto: string;
  @ManyToOne(() => Receta, (r) => r.pasos, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'idReceta' }) receta: Receta;
}
