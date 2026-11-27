import { TipoUsuario } from '../../database/entidades';

/** Datos que viajan dentro del token JWT. */
export interface SesionUsuario { idUs: number; tipoUsu: TipoUsuario; nombre: string }
