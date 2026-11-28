export * from './tipos';
export { Estado } from './estado.entity';
export { Municipio } from './municipio.entity';
export { Region } from './region.entity';
export { Lengua } from './lengua.entity';
export { Ingrediente } from './ingrediente.entity';
export { Usuario } from './usuario.entity';
export { Receta } from './receta.entity';
export { RecetaIngrediente } from './receta-ingrediente.entity';
export { Paso } from './paso.entity';
export { Comentario } from './comentario.entity';
export { Favorito } from './favorito.entity';

import { Comentario } from './comentario.entity';
import { Estado } from './estado.entity';
import { Favorito } from './favorito.entity';
import { Ingrediente } from './ingrediente.entity';
import { Lengua } from './lengua.entity';
import { Municipio } from './municipio.entity';
import { Paso } from './paso.entity';
import { Receta } from './receta.entity';
import { RecetaIngrediente } from './receta-ingrediente.entity';
import { Region } from './region.entity';
import { Usuario } from './usuario.entity';

/** Entidades que TypeORM mapea (tipo_usuario se usa como enum TipoUsuario en el código). */
export const ENTIDADES = [Estado, Municipio, Region, Lengua, Ingrediente, Usuario, Receta, RecetaIngrediente, Paso, Comentario, Favorito];
