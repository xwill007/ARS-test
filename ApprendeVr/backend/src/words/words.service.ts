import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SongsService } from '../songs/songs.service';
import { Word } from './entities/word.entity';

@Injectable()
export class WordsService {
  constructor(
    @InjectRepository(Word) private readonly wordsRepository: Repository<Word>,
    private readonly songsService: SongsService,
  ) {}

  // Vocabulario (Nivel 1/2 de evaluación, ver Requerimiento 009) de la canción cuyo archivo de
  // video es `fileName`. Devuelve `[]` si el archivo no corresponde a ninguna canción registrada,
  // en vez de fallar — el frontend ya maneja "sin palabras" como caso explícito.
  async findBySongFile(fileName: string): Promise<Word[]> {
    const song = await this.songsService.findByFileName(fileName);
    if (!song) return [];
    return this.wordsRepository.find({ where: { songId: song.id } });
  }
}
