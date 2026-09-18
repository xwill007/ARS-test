import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateSongDto } from './dto/create-song.dto';
import { Song } from './entities/song.entity';
import { buildDuplicateCriteria } from './songs.util';

// Fuentes visibles para CUALQUIER usuario (Requerimiento 014, ampliación — pedido del usuario:
// "las canciones con fuente cancion_server las debe visualizar todos los usuarios, con fuente
// local y youtube solo el usuario que las registra"). `'local'` no tiene el video en el servidor
// (vive en el `IndexedDB` del dispositivo de quien la agregó) y `'youtube'` tampoco es un archivo
// propio — ambas se tratan igual en cuanto a visibilidad: privadas al usuario que las creó.
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

  // Catálogo público (Requerimiento 014, ampliación): solo `source: 'server'` — 'local'/'youtube'
  // son privadas de quien las creó (ver `findMine()`), mezclarlas acá las mostraría a cualquier
  // usuario aunque no pueda reproducirlas (el video de 'local' ni siquiera está en el servidor).
  findAll(): Promise<Song[]> {
    return this.songsRepository.find({ where: { source: PUBLIC_SOURCE }, order: { id: 'ASC' } });
  }

  // Canciones `source: 'local'`/`'youtube'` DE ESTE usuario (Requerimiento 014, ampliación) — el
  // complemento de `findAll()`: `GET /songs/mine`, protegido con `JwtAuthGuard`, para que cada
  // usuario solo vea (y en el caso de 'local', intente reproducir desde su propio `IndexedDB`) las
  // canciones que él mismo agregó.
  findMine(userId: number): Promise<Song[]> {
    return this.songsRepository.find({
      where: { userId, source: In([...PRIVATE_SOURCES]) },
      order: { id: 'ASC' },
    });
  }

  async create(dto: CreateSongDto, userId: number): Promise<Song> {
    const { title, author } = buildDuplicateCriteria(dto.title, dto.author);

    // El criterio de duplicado se acota por usuario para 'local'/'youtube' (privadas, ver
    // PRIVATE_SOURCES): dos usuarios distintos agregando algo con el mismo título+autor no es un
    // conflicto real, cada uno tiene su propia copia. Para 'server' (catálogo compartido) se
    // mantiene el criterio global de siempre. `dto.source || PUBLIC_SOURCE` refleja el efectivo:
    // si no se envía, la BD lo trata como 'server' (su DEFAULT), no como un privado sin dueño.
    const effectiveSource = dto.source || PUBLIC_SOURCE;
    const isPrivateSource = (PRIVATE_SOURCES as readonly string[]).includes(effectiveSource);
    const existing = await this.songsRepository.findOne({
      where: isPrivateSource ? { title, author, userId } : { title, author },
    });
    if (existing) {
      throw new ConflictException('SONG_ALREADY_EXISTS');
    }

    // `language`/`source` se omiten del objeto (en vez de mandar `null`/valor por defecto
    // explícito) cuando no vienen en el DTO, para que el INSERT no incluya esas columnas y la BD
    // aplique sus DEFAULT ('ingles'/'server') — un valor explícito en el INSERT no dispara el
    // DEFAULT de MySQL. `userId` sí se manda siempre explícito: no depende de ningún DEFAULT de la
    // BD (columna nullable sin default propio) y viene del usuario autenticado (`@CurrentUser()`),
    // nunca del DTO, para que no pueda spoofearse en el body de la petición.
    const entity: Partial<Song> = { title, author, fileName: dto.fileName, userId };
    if (dto.language) entity.language = dto.language;
    if (dto.source) entity.source = dto.source;

    return this.songsRepository.save(this.songsRepository.create(entity));
  }
}
