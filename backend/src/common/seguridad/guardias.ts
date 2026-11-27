import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TipoUsuario } from '../../database/entidades';
import { SesionUsuario } from './sesion';

function leerToken(req: { headers?: Record<string, string | undefined> }, jwt: JwtService): SesionUsuario | null {
  const h = req.headers?.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  try { return jwt.verify<SesionUsuario>(h.slice(7)); } catch { return null; }
}

/** Exige sesión iniciada. */
@Injectable()
export class SesionGuard implements CanActivate {
  constructor(protected jwt: JwtService) {}
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    req.user = leerToken(req, this.jwt);
    if (!req.user) throw new UnauthorizedException('Inicia sesión para continuar.');
    return true;
  }
}

/** Lee la sesión si existe, pero no la exige (vistas públicas que cambian si hay sesión). */
@Injectable()
export class SesionOpcionalGuard implements CanActivate {
  constructor(private jwt: JwtService) {}
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    req.user = leerToken(req, this.jwt);
    return true;
  }
}

/** Portadores de saberes (tipoUsu 3) y moderadores (tipoUsu 1): quienes publican recetas. */
@Injectable()
export class PortadorGuard extends SesionGuard {
  canActivate(ctx: ExecutionContext) {
    super.canActivate(ctx);
    const t = ctx.switchToHttp().getRequest().user.tipoUsu;
    if (t !== TipoUsuario.PORTADOR && t !== TipoUsuario.ADMINISTRADOR)
      throw new ForbiddenException('Solo los portadores de saberes pueden publicar recetas.');
    return true;
  }
}

/** Solo el usuario moderador (tipoUsu 1): valida recetas y modera comentarios. */
@Injectable()
export class ModeradorGuard extends SesionGuard {
  canActivate(ctx: ExecutionContext) {
    super.canActivate(ctx);
    if (ctx.switchToHttp().getRequest().user.tipoUsu !== TipoUsuario.ADMINISTRADOR)
      throw new ForbiddenException('Solo el moderador puede hacer esto.');
    return true;
  }
}
