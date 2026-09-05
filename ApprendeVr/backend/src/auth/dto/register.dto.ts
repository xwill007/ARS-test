import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  // Sin normalizar todavía (ver requerimiento 004): se guarda tal cual llegue.
  @IsOptional()
  @IsString()
  level?: string;
}
