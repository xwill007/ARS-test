import { BadRequestException, Injectable } from '@nestjs/common';
import { join } from 'path';
import { PhrasesService } from '../phrases/phrases.service';
import { SongsService } from '../songs/songs.service';
import { DownloadVideoDto } from './dto/download-video.dto';
import { LyricsFromYoutubeDto } from './dto/lyrics-from-youtube.dto';
import { fetchYoutubePhrases, secondsToHms } from './youtube-captions.util';
import {
  downloadYoutubeVideo,
  karaokeVideosDir,
  slugifyFileName,
} from './youtube-video.util';

// Orquestador de la ingesta desde YouTube (Requerimiento 015). No duplica la lógica de
// `songs`/`phrases`; solo combina: obtiene la letra (subtítulos vía yt-dlp) o descarga el video
// (yt-dlp + ffmpeg) y delega la persistencia en `SongsService`/`PhrasesService`.
@Injectable()
export class SongIngestionService {
  constructor(
    private readonly songsService: SongsService,
    private readonly phrasesService: PhrasesService,
  ) {}

  // Botón "GET TEXT FROM YOUTUBE": obtiene la letra de `dto.youtubeUrl` y crea una frase por verso
  // (con su tiempo de inicio) asociada a la canción cuyo `fileName` es `dto.archivo`. Si no se
  // obtuvo ninguna frase (sin subtítulos), devuelve un error explícito y no guarda nada.
  async lyricsFromYoutube(dto: LyricsFromYoutubeDto) {
    const captions = await fetchYoutubePhrases(dto.youtubeUrl);
    if (!captions.length) {
      throw new BadRequestException('NO_LYRICS_FOUND');
    }

    const created = [];
    for (const c of captions) {
      const phrase = await this.phrasesService.create({
        archivo: dto.archivo,
        ingles_frase: c.text,
        // La traducción al español (LibreTranslate) es el siguiente paso del requerimiento 015;
        // mientras tanto se repite el inglés para que la columna NOT NULL no quede vacía y la
        // letra siga siendo cantable desde el overlay "Song Text".
        espanol_frase: c.text,
        tiempo_frase: secondsToHms(c.startTime),
      });
      created.push(phrase);
    }
    return { status: 'success', count: created.length };
  }

  // Botón "SAVE VIDEO YOUTUBE IN LOCAL": descarga el video a `public/videos/karaoke/<slug>.mp4` y
  // lo deja como canción local (`source: 'server'`, reproducible como textura 3D). Si `dto.archivo`
  // apunta a una canción existente, se reutiliza esa fila (cambia a local); si no, se crea una.
  async downloadVideo(dto: DownloadVideoDto, userId: number) {
    let title = dto.title;
    let author = dto.author;
    let existing = null;

    // Si `archivo` apunta a una canción existente (p. ej. la URL guardada de una canción
    // `source: 'youtube'`), se reutiliza su título/autor y su fila — así el frontend no necesita
    // mandarlos (el overlay "Song Text" solo conoce el `fileName` de la canción seleccionada).
    if (dto.archivo) {
      existing = await this.songsService.findByFileName(dto.archivo);
      if (existing) {
        title = existing.title;
        author = existing.author;
      }
    }

    if (!title) throw new BadRequestException('TITLE_REQUIRED');

    const fileName = slugifyFileName(title, author);
    await downloadYoutubeVideo(
      dto.youtubeUrl,
      join(karaokeVideosDir(), fileName),
    );

    if (existing) {
      const song = await this.songsService.markAsDownloaded(existing.id, fileName);
      return { status: 'success', song, fileName, created: false };
    }

    const song = await this.songsService.create(
      { title, author, fileName, source: 'server' },
      userId,
    );
    return { status: 'success', song, fileName, created: true };
  }
}
