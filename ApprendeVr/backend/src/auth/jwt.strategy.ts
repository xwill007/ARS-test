import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  // Passport llama a validate() tras verificar la firma/expiración del JWT. Devolver un valor
  // falsy hace que @nestjs/passport responda 401 automáticamente (sin lanzar nada explícito).
  validate(payload: { sub: number; email: string }) {
    return this.usersService.findById(payload.sub);
  }
}
