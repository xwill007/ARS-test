import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Song } from './entities/song.entity';

@Injectable()
export class SongsService {
  constructor(
    @InjectRepository(Song) private readonly songsRepository: Repository<Song>,
  ) {}

  findByFileName(fileName: string): Promise<Song | null> {
    return this.songsRepository.findOne({ where: { fileName } });
  }
}
