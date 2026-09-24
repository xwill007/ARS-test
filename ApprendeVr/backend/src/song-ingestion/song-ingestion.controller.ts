import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { DownloadVideoDto } from './dto/download-video.dto';
import { LyricsFromYoutubeDto } from './dto/lyrics-from-youtube.dto';
import { SongIngestionService } from './song-ingestion.service';

@Controller('song-ingestion')
export class SongIngestionController {
  constructor(private readonly songIngestionService: SongIngestionService) {}

  // Obtener letra: sin `JwtAuthGuard` (igual que `GET`/`POST /frases` — es parte del flujo de
  // mirror-fix, no un alta de contenido restringida; el criterio de privacidad ya lo aplica
  // `POST /songs`).
  @Post('lyrics-from-youtube')
  lyricsFromYoutube(@Body() dto: LyricsFromYoutubeDto) {
    return this.songIngestionService.lyricsFromYoutube(dto);
  }

  // Descargar video: protegido (escribe canciones, mismo criterio que `POST /songs`).
  @UseGuards(JwtAuthGuard)
  @Post('download-video')
  downloadVideo(@Body() dto: DownloadVideoDto, @CurrentUser() user: User) {
    return this.songIngestionService.downloadVideo(dto, user.id);
  }
}
