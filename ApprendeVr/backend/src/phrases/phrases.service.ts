import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SongsService } from '../songs/songs.service';
import { Phrase } from './entities/phrase.entity';

@Injectable()
export class PhrasesService {
  constructor(
    @InjectRepository(Phrase) private readonly phrasesRepository: Repository<Phrase>,
    private readonly songsService: SongsService,
  ) {}

  // Frases (Nivel 3 de evaluación, ver Requerimiento 009) de la canción cuyo archivo de video es
  // `fileName`. Devuelve `[]` si el archivo no corresponde a ninguna canción registrada, en vez
  // de fallar — el frontend ya maneja "sin frases" como caso explícito.
  async findBySongFile(fileName: string): Promise<Phrase[]> {
    const song = await this.songsService.findByFileName(fileName);
    if (!song) return [];
    return this.phrasesRepository.find({ where: { songId: song.id } });
  }
}
