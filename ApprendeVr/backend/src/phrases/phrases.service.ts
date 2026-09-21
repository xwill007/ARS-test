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
    // Orden determinístico: por tiempo ascendente y, ante empate (p.ej. todas las frases todavía
    // en 00:00:00, o frases que arrancan en el mismo instante), por id ascendente — el orden
    // natural de la letra. Sin este `order` el motor podía devolver las filas por PK por
    // casualidad, sin garantía, y el orden de la lista dependía del azar.
    return this.phrasesRepository.find({
      where: { songId: song.id },
      order: { time: 'ASC', id: 'ASC' },
    });
  }

  // Edición del tiempo de reproducción de una frase (overlay "Song Text", Requerimiento 015):
  // actualiza `tiempo_frase` de la frase indicada y devuelve la fila actualizada, o `null` si la
  // frase no existe (el controller lo traduce a 404).
  async updateTime(id: number, time: string): Promise<Phrase | null> {
    const phrase = await this.phrasesRepository.findOne({ where: { id } });
    if (!phrase) return null;
    phrase.time = time;
    return this.phrasesRepository.save(phrase);
  }
}
