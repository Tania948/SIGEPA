import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, Equals, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max,
  MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';
import { DIFICULTADES, LICENCIAS, TIPOS_PLATILLO } from './receta.formato';

export class IngredienteDto {
  @IsOptional() @IsString() @MaxLength(15) cantidad?: string;
  @IsOptional() @IsString() @MaxLength(20) unidad?: string;
  @IsString() @MinLength(1) @MaxLength(80) nombre: string;
}

export class PasoDto {
  @IsOptional() @IsString() @MaxLength(80) titulo?: string;
  @IsString() @MinLength(3) @MaxLength(1200) texto: string;
}

export class RecetaDto {
  @IsString() @MinLength(3) @MaxLength(30, { message: 'El nombre de la receta admite hasta 30 caracteres.' }) nombreReceta: string;
  @IsString() @MinLength(20, { message: 'Cuenta un poco más sobre la receta y su historia.' }) @MaxLength(4000) descripcion: string;
  @IsArray() @ArrayMinSize(1, { message: 'Agrega al menos un ingrediente.' }) @ArrayMaxSize(60)
  @ValidateNested({ each: true }) @Type(() => IngredienteDto) ingredientes: IngredienteDto[];
  @IsArray() @ArrayMinSize(1, { message: 'Agrega al menos un paso.' }) @ArrayMaxSize(40)
  @ValidateNested({ each: true }) @Type(() => PasoDto) pasos: PasoDto[];
  @IsInt({ message: 'Elige el estado de origen.' }) idEstado: number;
  @IsOptional() @IsInt() @Min(1) @Max(200) porciones?: number;
  @IsOptional() @IsInt() @Min(1) @Max(4320) tiempoTotal?: number;
  @IsOptional() @IsIn(DIFICULTADES) dificultad?: string;
  @IsOptional() @IsIn(TIPOS_PLATILLO) tipoPlatillo?: string;
  @IsOptional() @IsString() @MaxLength(60) region?: string;
  @IsOptional() @IsString() @MaxLength(80) localidad?: string;
  @IsOptional() @IsString() @MaxLength(80) municipio?: string;
  /** Clave geoestadística INEGI del municipio (5 dígitos, p. ej. 20068). */
  @IsOptional() @Matches(/^\d{5}$/) cveMun?: string;
  @IsOptional() @IsNumber() @Min(14) @Max(33) latitud?: number;
  @IsOptional() @IsNumber() @Min(-119) @Max(-86) longitud?: number;
  @IsOptional() @IsString() @MaxLength(600) consejo?: string;
  @IsOptional() @IsString() @MaxLength(2000) historia?: string;
  /** Nombre del platillo en su lengua originaria y la lengua (p. ej. "Tikin xiik'", "Maya yucateco"). */
  @IsOptional() @IsString() @MaxLength(60) nombreLengua?: string;
  @IsOptional() @IsString() @MaxLength(30) lengua?: string;
  @IsOptional() @IsIn(Object.keys(LICENCIAS)) licencia?: string;
  /** La persona declara que su comunidad está de acuerdo en compartir el saber. */
  @IsBoolean() @Equals(true, { message: 'Confirma que tu comunidad está de acuerdo en compartir esta receta.' })
  consentimiento: boolean;
  /** /uploads/… (foto subida) o un enlace https a una foto con licencia libre. */
  @IsOptional() @IsString() @MaxLength(255) @Matches(/^(\/uploads\/[\w.-]+|https:\/\/\S+)$/, { message: 'La foto debe ser un archivo subido o un enlace https.' })
  urlImagen?: string;
}

export class ValidacionDto {
  @IsIn(['pendiente', 'validada', 'rechazada']) estadoValidacion: 'pendiente' | 'validada' | 'rechazada';
}

/** Filtros de búsqueda (query string). Es interfaz a propósito: así ValidationPipe no la depura. */
export interface FiltrosReceta {
  q?: string; nombre?: string; ing?: string; ingModo?: string; estado?: string; region?: string; tipo?: string;
  dificultad?: string; tiempo?: string; mun?: string; tiempoMax?: string; conFoto?: string; autor?: string; ids?: string;
  orden?: string; page?: string; limit?: string;
}
