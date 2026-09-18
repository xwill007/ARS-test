import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { CreateSongDto } from './dto/create-song.dto';
import { SongsService } from './songs.service';

@Controller('songs')
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @Get()
  findAll() {
    return this.songsService.findAll();
  }

  // Requerimiento 014 (ampliación): canciones `source: 'local'`/`'youtube'` (privadas) DEL USUARIO
  // AUTENTICADO — no aparecen en `GET /songs` (catálogo público, solo `'server'`), así que el
  // frontend las pide acá aparte para combinarlas antes de armar la lista completa de
  // `VRKaraokeAf`.
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  findMine(@CurrentUser() user: User) {
    return this.songsService.findMine(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateSongDto, @CurrentUser() user: User) {
    return this.songsService.create(dto, user.id);
  }
}
