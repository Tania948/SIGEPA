import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

class TurnoDto {
  @IsIn(['usuario', 'asistente']) rol: 'usuario' | 'asistente';
  @IsString() @MaxLength(2000) texto: string;
}

export class PreguntaDto {
  @IsString() @MinLength(1) @MaxLength(500) mensaje: string;
  /** Turnos anteriores (se aceptan para conservar el contexto en el front). */
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TurnoDto) historial?: TurnoDto[];
}
