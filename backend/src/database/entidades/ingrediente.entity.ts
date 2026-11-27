import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Catálogo ingrediente: cada nombre aparece una sola vez. */
@Entity('ingrediente')
export class Ingrediente {
  @PrimaryGeneratedColumn() idIngrediente: number;
  @Column({ length: 80, unique: true }) nomIngrediente: string;
}
