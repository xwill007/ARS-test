import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { sanitizeUser } from '../common/sanitize-user.util';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { buildJwtPayload, normalizeEmail } from './auth.util';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = normalizeEmail(dto.email);
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('EMAIL_ALREADY_EXISTS');
    }

    const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersService.create({
      name: dto.name,
      email,
      password,
      level: dto.level,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const email = normalizeEmail(dto.email);
    const user = await this.usersService.findByEmail(email);
    const passwordMatches = user
      ? await bcrypt.compare(dto.password, user.password)
      : false;

    if (!user || !passwordMatches) {
      // Mismo mensaje exista o no el email, para no filtrar qué correos están registrados.
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: User) {
    const access_token = this.jwtService.sign(buildJwtPayload(user));
    return { access_token, user: sanitizeUser(user) };
  }
}
