import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Receta } from './receta.entity';
import { Usuario } from './usuario.entity';

/** Asociativa favorito (M:N usuario–receta). */
@Entity('favorito')
export class Favorito {
  @PrimaryColumn() idUs: number;
  @PrimaryColumn() idReceta: number;
  @CreateDateColumn({ type: 'datetime' }) fechaFavorito: Date;
  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'idUs' }) usuario: Usuario;
  @ManyToOne(() => Receta, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'idReceta' }) receta: Receta;
}
