import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSongDto } from './dto/create-song.dto';
import { Song } from './entities/song.entity';
import { buildDuplicateCriteria } from './songs.util';

@Injectable()
export class SongsService {
  constructor(
    @InjectRepository(Song) private readonly songsRepository: Repository<Song>,
  ) {}

  findByFileName(fileName: string): Promise<Song | null> {
    return this.songsRepository.findOne({ where: { fileName } });
  }

  findAll(): Promise<Song[]> {
    return this.songsRepository.find({ order: { id: 'ASC' } });
  }

  async create(dto: CreateSongDto): Promise<Song> {
    const { title, author } = buildDuplicateCriteria(dto.title, dto.author);

    const existing = await this.songsRepository.findOne({ where: { title, author } });
    if (existing) {
      throw new ConflictException('SONG_ALREADY_EXISTS');
    }

    // `language` se omite del objeto (en vez de mandar `null` explícito) cuando no viene en el
    // DTO, para que el INSERT no incluya la columna y la BD aplique su DEFAULT ('ingles') — un
    // `NULL` explícito en el INSERT no dispara el DEFAULT de MySQL, deja la columna en NULL.
    const entity: Partial<Song> = { title, author, fileName: dto.fileName };
    if (dto.language) entity.language = dto.language;

    return this.songsRepository.save(this.songsRepository.create(entity));
  }
}
