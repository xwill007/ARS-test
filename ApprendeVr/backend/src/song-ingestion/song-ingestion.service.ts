import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { tmpdir } from 'os';
import { join } from 'path';
import { Repository } from 'typeorm';
import { PhrasesService } from '../phrases/phrases.service';
import { SongsService } from '../songs/songs.service';
import { WordsService } from '../words/words.service';
import { ApplyLyricsSyncDto } from './dto/apply-lyrics-sync.dto';
import { CreateFromYoutubeDto } from './dto/create-from-youtube.dto';
import { DownloadVideoDto } from './dto/download-video.dto';
import { LyricsFromLrclibDto } from './dto/lyrics-from-lrclib.dto';
import { LyricsFromYoutubeDto } from './dto/lyrics-from-youtube.dto';
import { StagedPhrase } from './entities/lyrics-staging.entity';
import { compareLyrics, buildComparisonRows, timeStringToSeconds } from './lyrics-comparison.util';
import { fetchLrclibLyrics } from './lrclib.util';
import { tokenizeWords } from './lyrics.util';
import { translateText } from './translation.util';
import {
  CaptionLine,
  fetchYoutubePhrases,
  secondsToHms,
} from './youtube-captions.util';
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
    @InjectRepository(StagedPhrase)
    private readonly stagedPhrasesRepository: Repository<StagedPhrase>,
  ) {}

  // Botón "GET TEXT FROM YOUTUBE": obtiene la letra de `dto.youtubeUrl`, la traduce al español y
  // crea una frase por verso (con su tiempo de inicio) + una palabra por token (traducida) asociada
  // a la canción cuyo `fileName` es `dto.archivo`. Si no hay subtítulos, error explícito y no se
  // guarda nada. Todo o nada: la traducción (frases y palabras) se resuelve ANTES de insertar,
  // así una falla de traducción no deja frases a medio guardar.
  async lyricsFromYoutube(dto: LyricsFromYoutubeDto) {
    const { captions, source } = await this.resolveCaptions(
      dto.youtubeUrl,
      dto.archivo,
    );
    const { count, words } = await this.ingestCaptions(captions, dto.archivo);
    return { status: 'success', count, words, source };
  }

  // Endpoint único `POST /song-ingestion/from-youtube` (Requerimiento 015, pendiente P4): pipeline de
  // un solo paso que crea la canción Y le carga la letra. `sourceMode` decide el destino del video:
  //   - 'download': descarga a `public/videos/karaoke/<slug>.mp4` y deja `source:
  //     ['youtube','server']` (pública).
  //   - 'stream':   sin descarga; deja `source: ['youtube']` (privada) con `fileName` = URL completa
  //     de YouTube — IGUAL que las canciones YouTube creadas por el flujo manual (`POST /songs` con
  //     `source: ['youtube']`), para que la reproducción (`_playYoutubeSong`) y la letra
  //     (`GET /api/frases?archivo=<fileName>`) matcheen con el MISMO identificador. La URL se
  //     conserva también en `url` (trazabilidad).
  // La letra (subtítulos con fallback a LRCLIB) se traduce e inserta contra el `fileName` final de
  // la canción. Si la letra falla (p. ej. `NO_LYRICS_FOUND`), la canción queda creada sin frases —
  // mismo criterio que las acciones separadas (descargar y traer letra son pasos independientes).
  async createSongFromYoutube(dto: CreateFromYoutubeDto, userId: number) {
    let song;

    if (dto.sourceMode === 'download') {
      const fileName = slugifyFileName(dto.title, dto.author);
      await downloadYoutubeVideo(
        dto.youtubeUrl,
        join(karaokeVideosDir(), fileName),
      );
      song = await this.songsService.create(
        {
          title: dto.title,
          author: dto.author,
          fileName,
          source: ['youtube', 'server'],
          url: dto.youtubeUrl,
        },
        userId,
      );
    } else {
      // stream: sin descarga. `fileName` es la URL completa (no un video ID): así la canción se
      // reproduce con `_playYoutubeSong(fileName)` (que extrae el video ID internamente) y las
      // frases, guardadas con `archivo = fileName`, matchean en `GET /api/frases`. Mismo criterio
      // que las canciones YouTube del flujo manual.
      song = await this.songsService.create(
        {
          title: dto.title,
          author: dto.author,
          fileName: dto.youtubeUrl,
          source: ['youtube'],
          url: dto.youtubeUrl,
        },
        userId,
      );
    }

    const { captions, source } = await this.resolveCaptions(
      dto.youtubeUrl,
      song.fileName,
    );
    const { count, words } = await this.ingestCaptions(
      captions,
      song.fileName,
    );

    return {
      status: 'success',
      song,
      created: true,
      lyrics: { count, words, source },
    };
  }

  // Resuelve la letra para `youtubeUrl`: subtítulos de YouTube, con fallback automático a LRCLIB
  // (derivando artista/título de la canción `archivo`) cuando el video no tiene subtítulos en
  // inglés. Lanza `NO_LYRICS_FOUND` si ninguna fuente devuelve letra.
  private async resolveCaptions(
    youtubeUrl: string,
    archivo: string,
  ): Promise<{ captions: CaptionLine[]; source: 'youtube' | 'lrclib' }> {
    let captions = await fetchYoutubePhrases(youtubeUrl);
    let source: 'youtube' | 'lrclib' = 'youtube';

    if (!captions.length) {
      captions = await this.fetchLrclibFallback(archivo);
      source = 'lrclib';
    }

    if (!captions.length) {
      throw new BadRequestException('NO_LYRICS_FOUND');
    }
    return { captions, source };
  }

  // Traduce todas las frases y palabras únicas de `captions` (todo o nada) e inserta una frase por
  // verso + una palabra por token asociadas a la canción `archivo`. Devuelve cuántas frases y
  // palabras se crearon.
  private async ingestCaptions(
    captions: CaptionLine[],
    archivo: string,
  ): Promise<{ count: number; words: number }> {
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
        archivo,
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
    return { count: created.length, words: totalWords };
  }

  // Fallback automático a LRCLIB (Requerimiento 015, pendiente P2): deriva artista/título de la
  // canción identificada por `archivo` (igual que `fetchLyricsFromLrclib`) e intenta la letra
  // sincronizada de LRCLIB. Devuelve `[]` si no hay canción, faltan artista/título o LRCLIB no
  // tiene letra (con lo que `lyricsFromYoutube` termina lanzando `NO_LYRICS_FOUND`).
  private async fetchLrclibFallback(archivo: string): Promise<CaptionLine[]> {
    const song = await this.songsService.findByFileName(archivo);
    if (!song) return [];
    const artistName = (song.author || '').trim();
    const trackName = (song.title || '').trim();
    if (!artistName || !trackName) return [];
    return fetchLrclibLyrics(artistName, trackName);
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
      const song = await this.songsService.markAsDownloaded(
        existing.id,
        fileName,
        dto.youtubeUrl,
      );
      return { status: 'success', song, fileName, created: false };
    }

    const song = await this.songsService.create(
      { title, author, fileName, source: ['youtube', 'server'], url: dto.youtubeUrl },
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
      const song = await this.songsService.markAsLocal(
        existing.id,
        fileName,
        dto.youtubeUrl,
      );
      return { fileName, filePath, song, created: false };
    }

    const song = await this.songsService.create(
      { title, author, fileName, source: ['youtube', 'local'], url: dto.youtubeUrl },
      userId,
    );
    return { fileName, filePath, song, created: true };
  }

  // Botón "GET TEXT LYRICS" (Requerimiento 015, fallback LRCLIB): obtiene la letra sincronizada de
  // LRCLIB (por artista + título) para la canción identificada por `dto.archivo`, la guarda en la
  // tabla de STAGING (`frases_vr_staging`) y devuelve la comparación contra las frases existentes:
  // qué frases con tiempo 00:00:00.0 recibirían tiempo, y qué líneas no concuerdan (para que el
  // usuario apruebe o rechace). NO toca `frases_vr` todavía — el alta real ocurre en
  // `applyLyricsSync`.
  async fetchLyricsFromLrclib(dto: LyricsFromLrclibDto) {
    const song = await this.songsService.findByFileName(dto.archivo);
    if (!song) throw new NotFoundException('SONG_NOT_FOUND');

    const artistName = (dto.artistName || song.author || '').trim();
    const trackName = (dto.trackName || song.title || '').trim();
    if (!artistName || !trackName) {
      throw new BadRequestException('ARTIST_TRACK_REQUIRED');
    }

    const lyrics = await fetchLrclibLyrics(artistName, trackName);
    if (!lyrics.length) throw new BadRequestException('NO_LYRICS_FOUND');

    // Reemplaza el staging previo de esta canción (idempotente: cada "GET TEXT LYRICS" arranca de
    // cero, sin acumular líneas de consultas anteriores).
    await this.stagedPhrasesRepository.delete({ songId: song.id });
    const staged = await this.stagedPhrasesRepository.save(
      lyrics.map((l) =>
        this.stagedPhrasesRepository.create({
          songId: song.id,
          english: l.text,
          time: secondsToHms(l.startTime),
        }),
      ),
    );

    const existing = await this.phrasesService.findBySongFile(dto.archivo);
    const comparison = compareLyrics(lyrics, existing);
    const rows = buildComparisonRows(lyrics, existing);

    return { status: 'success', stagedCount: staged.length, comparison, rows };
  }

  // Aprobación del botón "GET TEXT LYRICS" (Requerimiento 015): aplica el staging de LRCLIB a
  // `frases_vr`. Las frases con tiempo 00:00:00.0 matcheadas reciben su tiempo (se actualizan
  // siempre); si `acceptMismatches` es true, las líneas que no concuerdan se insertan como frases
  // nuevas (traducidas al español con LibreTranslate). Al final borra el staging.
  async applyLyricsSync(dto: ApplyLyricsSyncDto) {
    const song = await this.songsService.findByFileName(dto.archivo);
    if (!song) throw new NotFoundException('SONG_NOT_FOUND');

    const stagedRows = await this.stagedPhrasesRepository.find({
      where: { songId: song.id },
      order: { id: 'ASC' },
    });
    if (!stagedRows.length) throw new BadRequestException('NO_STAGED_LYRICS');

    const stagedLyrics = stagedRows.map((r) => ({
      text: r.english,
      startTime: timeStringToSeconds(r.time),
    }));
    const existing = await this.phrasesService.findBySongFile(dto.archivo);
    const { assignments, mismatches } = compareLyrics(stagedLyrics, existing);

    // Traducción de las líneas nuevas ANTES de insertar (todo o nada para los mismatches): si una
    // falla, no se inserta ninguna y no se borra el staging (se puede reintentar).
    let translatedMismatches: { text: string; spanish: string; startTime: number }[] = [];
    if (dto.acceptMismatches && mismatches.length) {
      const baseUrl = this.configService.get<string>('libreTranslateUrl');
      if (!baseUrl) throw new BadRequestException('TRANSLATION_NOT_CONFIGURED');
      translatedMismatches = await Promise.all(
        mismatches.map(async (m) => ({
          text: m.text,
          spanish: await translateText(baseUrl, m.text, 'en', 'es'),
          startTime: m.startTime,
        })),
      );
    }

    let appliedTimes = 0;
    for (const a of assignments) {
      const updated = await this.phrasesService.updateTime(a.phraseId, a.newTime);
      if (updated) appliedTimes++;
    }

    let insertedPhrases = 0;
    for (const m of translatedMismatches) {
      await this.phrasesService.create({
        archivo: dto.archivo,
        ingles_frase: m.text,
        espanol_frase: m.spanish,
        tiempo_frase: secondsToHms(m.startTime),
      });
      insertedPhrases++;
    }

    await this.stagedPhrasesRepository.delete({ songId: song.id });

    return {
      status: 'success',
      appliedTimes,
      insertedPhrases,
      skippedMismatches: dto.acceptMismatches ? 0 : mismatches.length,
    };
  }
}
