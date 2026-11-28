import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Ingrediente } from './ingrediente.entity';
import { Receta } from './receta.entity';

/** Asociativa receta_ingrediente (M:N con atributos). PK compuesta (idReceta, idIngrediente). */
@Entity('receta_ingrediente')
export class RecetaIngrediente {
  @PrimaryColumn() idReceta: number;
  @PrimaryColumn() idIngrediente: number;
  @Column({ type: 'tinyint', unsigned: true }) orden: number;
  /** DECIMAL(8,2); el driver lo entrega como texto. NULL = "al gusto". */
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true }) cantidad: string | null;
  @Column({ type: 'varchar', length: 20, nullable: true }) unidad: string | null;
  @Column({ type: 'varchar', length: 60, nullable: true }) nota: string | null;
  @ManyToOne(() => Receta, (r) => r.ingredientes, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'idReceta' }) receta: Receta;
  @ManyToOne(() => Ingrediente) @JoinColumn({ name: 'idIngrediente' }) ingrediente: Ingrediente;
}
