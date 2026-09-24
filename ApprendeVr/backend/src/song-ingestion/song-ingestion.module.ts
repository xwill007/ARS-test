import { Module } from '@nestjs/common';
import { PhrasesModule } from '../phrases/phrases.module';
import { SongsModule } from '../songs/songs.module';
import { SongIngestionController } from './song-ingestion.controller';
import { SongIngestionService } from './song-ingestion.service';

@Module({
  imports: [SongsModule, PhrasesModule],
  controllers: [SongIngestionController],
  providers: [SongIngestionService],
})
export class SongIngestionModule {}
