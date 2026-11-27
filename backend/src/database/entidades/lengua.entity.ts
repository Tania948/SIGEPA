import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Catálogo lengua: lenguas originarias en que se nombra un platillo. */
@Entity('lengua')
export class Lengua {
  @PrimaryGeneratedColumn() idLengua: number;
  @Column({ length: 40, unique: true }) nomLengua: string;
}
