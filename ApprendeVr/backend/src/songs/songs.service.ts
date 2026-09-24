import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { CreateSongDto } from './dto/create-song.dto';
import { Song } from './entities/song.entity';
import { addSource, buildDuplicateCriteria, hasSource, serializeSources } from './songs.util';

// `fuente_cancion` es multi-source (Requerimiento 015, ampliación): una lista separada por comas.
// La visibilidad se define por PRESENCIA de fuentes, no por igualdad:
//   - Pública (visible para todos)  → contiene 'server' (hay un archivo real en el servidor).
//   - Privada (solo su creador)     → NO contiene 'server' pero contiene 'local' o 'youtube'.
// Esto preserva la regla del Requerimiento 014 ("local y youtube solo el usuario que las registra")
// a la vez que permite una canción `youtube,server`: pública por su archivo en el servidor, pero
// conservando su origen YouTube para el botón "YouTube" de la lista.
const PUBLIC_SOURCE = 'server';
const PRIVATE_SOURCES = ['local', 'youtube'] as const;

@Injectable()
export class SongsService {
  constructor(
    @InjectRepository(Song) private readonly songsRepository: Repository<Song>,
  ) {}

  findByFileName(fileName: string): Promise<Song | null> {
    return this.songsRepository.findOne({ where: { fileName } });
  }

  // Marca una canción como descargada a servidor (Requerimiento 015, botón "SAVE VIDEO YOUTUBE IN
  // SERVER"): reemplaza su `fileName` (p. ej. la URL de YouTube) por el nombre del `.mp4` local
  // recién descargado y AGREGA 'server' a `source` (sin pisar el resto — p. ej. conserva
  // 'youtube' para que el botón "YouTube" siga disponible). Si se pasa `url`, se conserva en
  // `url_cancion` la URL de origen y se asegura 'youtube' en la lista (origen YouTube). Devuelve
  // `null` si no existe la canción indicada.
  async markAsDownloaded(
    id: number,
    fileName: string,
    url?: string,
  ): Promise<Song | null> {
    const song = await this.songsRepository.findOne({ where: { id } });
    if (!song) return null;
    song.fileName = fileName;
    song.source = addSource(song.source, 'server');
    if (url) {
      song.url = url;
      song.source = addSource(song.source, 'youtube');
    }
    return this.songsRepository.save(song);
  }

  // Marca una canción como guardada en el dispositivo del usuario (Requerimiento 015, botón "SAVE
  // VIDEO YOUTUBE IN LOCAL"): igual que `markAsDownloaded`, pero agregando 'local' en vez de
  // 'server' — el video vive en el IndexedDB del navegador de ese usuario, no en el servidor.
  // Privada (solo la ve quien la creó, ver `findMine`). Igual que arriba, conserva la `url` de
  // origen si se pasa.
  async markAsLocal(
    id: number,
    fileName: string,
    url?: string,
  ): Promise<Song | null> {
    const song = await this.songsRepository.findOne({ where: { id } });
    if (!song) return null;
    song.fileName = fileName;
    song.source = addSource(song.source, 'local');
    if (url) {
      song.url = url;
      song.source = addSource(song.source, 'youtube');
    }
    return this.songsRepository.save(song);
  }

  // Catálogo público: canciones que contienen 'server' en `source` (archivo real reproducible por
  // cualquiera). Incluye combinaciones como `youtube,server` (descargadas de YouTube al servidor).
  findAll(): Promise<Song[]> {
    return this.songsRepository.find({
      where: { source: Like(`%${PUBLIC_SOURCE}%`) },
      order: { id: 'ASC' },
    });
  }

  // Canciones privadas DE ESTE usuario: contienen 'local'/'youtube' pero NO 'server' (si tuvieran
  // 'server' ya vendrían en `findAll()` y duplicarlas acá rompería la lista de VRKaraokeAf). El
  // complemento de `findAll()`: `GET /songs/mine`, protegido con `JwtAuthGuard`.
  findMine(userId: number): Promise<Song[]> {
    return this.songsRepository
      .createQueryBuilder('song')
      .where('song.userId = :userId', { userId })
      .andWhere("(song.source LIKE '%local%' OR song.source LIKE '%youtube%')")
      .andWhere("song.source NOT LIKE '%server%'")
      .orderBy('song.id', 'ASC')
      .getMany();
  }

  async create(dto: CreateSongDto, userId: number): Promise<Song> {
    const { title, author } = buildDuplicateCriteria(dto.title, dto.author);

    // El criterio de duplicado se acota por usuario cuando la canción es privada (no contiene
    // 'server'): dos usuarios distintos agregando algo con el mismo título+autor no es un conflicto
    // real, cada uno tiene su propia copia. Para una canción con 'server' (catálogo compartido) se
    // mantiene el criterio global. Sin `source` en el DTO, la BD aplica su DEFAULT 'server'
    // (pública), reflejado en `isPrivateSource === false`.
    const isPrivateSource =
      dto.source !== undefined && !hasSource(dto.source, PUBLIC_SOURCE);
    const existing = await this.songsRepository.findOne({
      where: isPrivateSource ? { title, author, userId } : { title, author },
    });
    if (existing) {
      throw new ConflictException('SONG_ALREADY_EXISTS');
    }

    // `language`/`source` se omiten del objeto (en vez de mandar `null`/valor por defecto
    // explícito) cuando no vienen en el DTO, para que el INSERT no incluya esas columnas y la BD
    // aplique sus DEFAULT ('ingles'/'server') — un valor explícito en el INSERT no dispara el
    // DEFAULT de MySQL. `source` se serializa a su forma persistida (string separado por comas).
    // `userId` sí se manda siempre explícito: no depende de ningún DEFAULT de la BD (columna
    // nullable sin default propio) y viene del usuario autenticado (`@CurrentUser()`), nunca del
    // DTO, para que no pueda spoofearse en el body de la petición.
    const entity: Partial<Song> = { title, author, fileName: dto.fileName, userId };
    if (dto.language) entity.language = dto.language;
    if (dto.source) entity.source = serializeSources(dto.source);
    if (dto.url) entity.url = dto.url;

    return this.songsRepository.save(this.songsRepository.create(entity));
  }
}
