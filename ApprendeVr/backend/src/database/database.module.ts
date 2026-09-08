import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        // Cada módulo de dominio registra sus entidades vía TypeOrmModule.forFeature(); no hay
        // que listarlas aquí (evita que DatabaseModule dependa de otros dominios).
        autoLoadEntities: true,
        // Revisión de zona horaria pedida por el usuario: fija explícitamente que el driver
        // mysql2 interprete/emita los `TIMESTAMP`/`DATETIME` de la BD como UTC (`'Z'`), en vez de
        // depender del reloj/zona horaria del proceso Node (`process.env.TZ`, que puede no
        // coincidir con la del servidor MySQL). Debe coincidir con `--default-time-zone=+00:00`
        // del contenedor (ver docker-compose.yml) para que ambos lados queden alineados.
        timezone: 'Z',
        // Nunca en producción: el esquema de `english_vr` ya existe (importado del dump), no lo
        // gestiona TypeORM.
        synchronize: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
