import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class ComentarioDto { @IsString() @MinLength(2) @MaxLength(1500) comentario: string }

export class ModeracionDto {
  @IsIn(['publicado', 'oculto', 'eliminado']) estadoComentario: 'publicado' | 'oculto' | 'eliminado';
}
