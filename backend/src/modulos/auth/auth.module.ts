import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../../database/entidades';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/** Registro (usuario o portador de saberes) e inicio de sesión con JWT. */
@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
