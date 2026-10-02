import { Body, Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { unlink } from 'fs/promises';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { ApplyLyricsSyncDto } from './dto/apply-lyrics-sync.dto';
import { CreateFromYoutubeDto } from './dto/create-from-youtube.dto';
import { DownloadVideoDto } from './dto/download-video.dto';
import { LyricsFromLrclibDto } from './dto/lyrics-from-lrclib.dto';
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

  // Metadata de una URL de YouTube (título/autor) para autocompletar el panel "New Song" al pegar
  // una URL (Requerimiento 015). Sin `JwtAuthGuard`: solo lectura, no escribe canciones.
  @Get('youtube-metadata')
  youtubeMetadata(@Query('youtubeUrl') youtubeUrl: string) {
    return this.songIngestionService.getYoutubeMetadata(youtubeUrl);
  }

  // Obtener letra sincronizada desde LRCLIB (botón "GET TEXT LYRICS"): sin `JwtAuthGuard`, igual
  // que `lyrics-from-youtube`/`POST /frases` — es parte del flujo de mirror-fix, no un alta de
  // contenido restringida. Descarga a la tabla de STAGING y devuelve la comparación para que el
  // usuario apruebe antes de aplicar.
  @Post('lyrics-from-lrclib')
  lyricsFromLrclib(@Body() dto: LyricsFromLrclibDto) {
    return this.songIngestionService.fetchLyricsFromLrclib(dto);
  }

  // Aprobación del staging de LRCLIB (botón "GET TEXT LYRICS" → confirmar): aplica los tiempos a
  // las frases 00:00:00.0 y, opcionalmente, inserta las líneas nuevas aceptadas. Sin `JwtAuthGuard`,
  // mismo criterio que `lyrics-from-lrclib`.
  @Post('apply-lyrics-sync')
  applyLyricsSync(@Body() dto: ApplyLyricsSyncDto) {
    return this.songIngestionService.applyLyricsSync(dto);
  }

  // Pipeline único (Requerimiento 015, pendiente P4): crea la canción Y le carga la letra en un
  // solo paso. Protegido (escribe canciones, mismo criterio que `POST /songs`/`download-video`).
  @UseGuards(JwtAuthGuard)
  @Post('from-youtube')
  fromYoutube(@Body() dto: CreateFromYoutubeDto, @CurrentUser() user: User) {
    return this.songIngestionService.createSongFromYoutube(dto, user.id);
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
