import { Module } from '@nestjs/common';
import { PhrasesModule } from '../phrases/phrases.module';
import { SongsModule } from '../songs/songs.module';
import { WordsModule } from '../words/words.module';
import { SongIngestionController } from './song-ingestion.controller';
import { SongIngestionService } from './song-ingestion.service';

@Module({
  imports: [SongsModule, PhrasesModule, WordsModule],
  controllers: [SongIngestionController],
  providers: [SongIngestionService],
})
export class SongIngestionModule {}
