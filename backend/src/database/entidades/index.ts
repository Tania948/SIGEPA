export * from './tipos';
export { Estado } from './estado.entity';
export { Usuario } from './usuario.entity';
export { Receta } from './receta.entity';
export { Comentario } from './comentario.entity';

import { Comentario } from './comentario.entity';
import { Estado } from './estado.entity';
import { Receta } from './receta.entity';
import { Usuario } from './usuario.entity';

export const ENTIDADES = [Estado, Usuario, Receta, Comentario];
