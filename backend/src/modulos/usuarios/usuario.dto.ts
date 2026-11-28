import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class PerfilDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(20) nombre?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(20) apPat?: string;
  @IsOptional() @IsString() @MaxLength(20) apMat?: string;
  @IsOptional() @IsEmail({}, { message: 'Escribe un correo válido.' }) @MaxLength(40) email?: string;
}
