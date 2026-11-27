import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const CONTRASENIA_SEGURA = /^(?=.*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ])(?=.*\d)/;

export class RegistroDto {
  @IsString() @MinLength(2) @MaxLength(60) nombreCompleto: string;
  @IsEmail({}, { message: 'Escribe un correo válido.' }) @MaxLength(40) email: string;
  @IsString() @MinLength(8, { message: 'La contraseña necesita al menos 8 caracteres.' })
  @MaxLength(72) @Matches(CONTRASENIA_SEGURA, { message: 'La contraseña necesita al menos una letra y un número.' })
  contrasenia: string;
  @IsOptional() @IsString() @MaxLength(40) usuario?: string;
  /** "portador" = portador de saberes (publica recetas); "usuario" = explora y guarda. */
  @IsOptional() @IsIn(['usuario', 'portador']) rol?: 'usuario' | 'portador';
}

export class LoginDto {
  @IsEmail({}, { message: 'Escribe un correo válido.' }) email: string;
  @IsString() @MaxLength(72) contrasenia: string;
  @IsOptional() @IsBoolean() recordar?: boolean;
}
