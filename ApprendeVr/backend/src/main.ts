import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api');
  // whitelist: descarta props no declaradas en el DTO (ej. age/nativeLanguage/targetLanguage que
  // hoy manda el frontend pero que aún no persiste la entidad `User`) en vez de rechazar la
  // petición entera.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: configService.get('corsOrigin'), credentials: true });

  await app.listen(configService.get<number>('port') ?? 3001);
}
bootstrap();
