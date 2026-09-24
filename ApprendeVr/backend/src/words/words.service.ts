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

  // Alta de palabra (Requerimiento 015, pipeline de ingesta): inserta una fila en `palabras_vr`
  // linkeada a su canción (`songId`) y a su frase (`phraseId`). Se usa solo internamente desde
  // `song-ingestion`, no se expone como endpoint público.
  async create(
    songId: number,
    phraseId: number,
    english: string,
    spanish: string,
  ): Promise<Word> {
    const entity = this.wordsRepository.create({
      songId,
      phraseId,
      english,
      spanish,
    });
    return this.wordsRepository.save(entity);
  }
}
