import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { tmpdir } from 'os';
import { join } from 'path';
import { PhrasesService } from '../phrases/phrases.service';
import { SongsService } from '../songs/songs.service';
import { WordsService } from '../words/words.service';
import { DownloadVideoDto } from './dto/download-video.dto';
import { LyricsFromYoutubeDto } from './dto/lyrics-from-youtube.dto';
import { tokenizeWords } from './lyrics.util';
import { translateText } from './translation.util';
import { fetchYoutubePhrases, secondsToHms } from './youtube-captions.util';
import {
  downloadYoutubeVideo,
  karaokeVideosDir,
  slugifyFileName,
} from './youtube-video.util';

// Orquestador de la ingesta desde YouTube (Requerimiento 015). No duplica la lógica de
// `songs`/`phrases`/`words`; solo combina: obtiene la letra (subtítulos vía yt-dlp), la traduce
// (LibreTranslate) o descarga el video (yt-dlp + ffmpeg) y delega la persistencia en los services
// de cada dominio.
@Injectable()
export class SongIngestionService {
  constructor(
    private readonly songsService: SongsService,
    private readonly phrasesService: PhrasesService,
    private readonly wordsService: WordsService,
    private readonly configService: ConfigService,
  ) {}

  // Botón "GET TEXT FROM YOUTUBE": obtiene la letra de `dto.youtubeUrl`, la traduce al español y
  // crea una frase por verso (con su tiempo de inicio) + una palabra por token (traducida) asociada
  // a la canción cuyo `fileName` es `dto.archivo`. Si no hay subtítulos, error explícito y no se
  // guarda nada. Todo o nada: la traducción (frases y palabras) se resuelve ANTES de insertar,
  // así una falla de traducción no deja frases a medio guardar.
  async lyricsFromYoutube(dto: LyricsFromYoutubeDto) {
    const captions = await fetchYoutubePhrases(dto.youtubeUrl);
    if (!captions.length) {
      throw new BadRequestException('NO_LYRICS_FOUND');
    }

    const baseUrl = this.configService.get<string>('libreTranslateUrl');
    if (!baseUrl) {
      throw new BadRequestException('TRANSLATION_NOT_CONFIGURED');
    }

    // Traduce todas las frases por adelantado (todo o nada).
    const translatedPhrases = await Promise.all(
      captions.map((c) => translateText(baseUrl, c.text, 'en', 'es')),
    );

    // Traduce cada palabra única una sola vez (cache global), para no repetir la misma palabra en
    // cada frase.
    const uniqueWords = new Set<string>();
    for (const c of captions) {
      for (const w of tokenizeWords(c.text)) uniqueWords.add(w);
    }
    const words = [...uniqueWords];
    const translatedWords = await Promise.all(
      words.map((w) => translateText(baseUrl, w, 'en', 'es')),
    );
    const wordCache = new Map<string, string>();
    words.forEach((w, i) => wordCache.set(w, translatedWords[i]));

    let totalWords = 0;
    const created = [];
    for (let i = 0; i < captions.length; i++) {
      const phrase = await this.phrasesService.create({
        archivo: dto.archivo,
        ingles_frase: captions[i].text,
        espanol_frase: translatedPhrases[i],
        tiempo_frase: secondsToHms(captions[i].startTime),
      });
      for (const w of tokenizeWords(captions[i].text)) {
        await this.wordsService.create(
          phrase.songId,
          phrase.id,
          w,
          wordCache.get(w) as string,
        );
        totalWords++;
      }
      created.push(phrase);
    }
    return { status: 'success', count: created.length, words: totalWords };
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

  // Botón "SAVE VIDEO YOUTUBE IN LOCAL": descarga el video de `dto.youtubeUrl` a un archivo
  // TEMPORAL del servidor (para poder transferirlo al navegador) y lo registra como canción privada
  // (`source: 'local'`, el video vive en el IndexedDB del dispositivo del usuario, no en el
  // servidor). Devuelve `filePath` (que el controller streamea al navegador y luego borra) y
  // `fileName` (la clave con la que el frontend lo guarda en IndexedDB y que viaja en la metadata).
  async downloadVideoToDevice(dto: DownloadVideoDto, userId: number) {
    let title = dto.title;
    let author = dto.author;
    let existing = null;

    if (dto.archivo) {
      existing = await this.songsService.findByFileName(dto.archivo);
      if (existing) {
        title = existing.title;
        author = existing.author;
      }
    }

    if (!title) throw new BadRequestException('TITLE_REQUIRED');

    const fileName = slugifyFileName(title, author);
    const filePath = join(
      tmpdir(),
      `apprendevr-device-${Date.now()}-${fileName}`,
    );
    await downloadYoutubeVideo(dto.youtubeUrl, filePath);

    if (existing) {
      const song = await this.songsService.markAsLocal(existing.id, fileName);
      return { fileName, filePath, song, created: false };
    }

    const song = await this.songsService.create(
      { title, author, fileName, source: 'local' },
      userId,
    );
    return { fileName, filePath, song, created: true };
  }
}
