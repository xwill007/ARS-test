import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { unlink } from 'fs/promises';
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

  // Descargar video al dispositivo del usuario (botón "SAVE VIDEO YOUTUBE IN LOCAL"): protegido,
  // igual que `download-video`. A diferencia de `download-video` (que deja el archivo en
  // `public/videos/karaoke/` del servidor), acá el video se streamea de vuelta al navegador (que lo
  // guarda en su IndexedDB) y el archivo temporal se borra al terminar. El nombre de archivo viaja
  // en el header `X-File-Name` para que el frontend sepa con qué clave guardarlo en IndexedDB.
  @UseGuards(JwtAuthGuard)
  @Post('download-video-to-device')
  async downloadVideoToDevice(
    @Body() dto: DownloadVideoDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<void> {
    const { fileName, filePath } =
      await this.songIngestionService.downloadVideoToDevice(dto, user.id);
    res.setHeader('X-File-Name', encodeURIComponent(fileName));
    res.setHeader('Content-Type', 'video/mp4');
    res.sendFile(filePath, () => {
      // Borra el archivo temporal una vez enviado (o si falló el envío) — el video real queda en
      // el IndexedDB del cliente, no debe persistir en el servidor.
      unlink(filePath).catch(() => undefined);
    });
  }
}
