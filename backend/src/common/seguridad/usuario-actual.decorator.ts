import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SesionUsuario } from './sesion';

/** Inyecta la sesión del usuario en un parámetro del controlador: `@UsuarioActual() s: SesionUsuario`. */
export const UsuarioActual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): SesionUsuario | null => ctx.switchToHttp().getRequest().user ?? null,
);
