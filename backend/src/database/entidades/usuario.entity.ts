import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Receta } from './receta.entity';
import { TipoUsuario } from './tipos';

/** Tabla usuario. tipoUsu es llave foránea al catálogo tipo_usuario. */
@Entity('usuario')
export class Usuario {
  @PrimaryGeneratedColumn({ name: 'idUs' }) idUs: number;
  @Column({ length: 40, unique: true }) usuario: string;
  /** Hash bcrypt, nunca texto plano. No se lee salvo que se pida explícitamente. */
  @Column({ length: 255, select: false }) contrasenia: string;
  @Column({ length: 20 }) nombre: string;
  @Column({ length: 20 }) apPat: string;
  @Column({ type: 'varchar', length: 20, nullable: true }) apMat: string | null;
  @Column({ type: 'tinyint', default: TipoUsuario.REGULAR }) tipoUsu: TipoUsuario;
  @Column({ length: 40, unique: true }) email: string;
  @OneToMany(() => Receta, (r) => r.usuario) recetas: Receta[];
}
