import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PhrasesModule } from '../phrases/phrases.module';
import { SongsModule } from '../songs/songs.module';
import { WordsModule } from '../words/words.module';
import { StagedPhrase } from './entities/lyrics-staging.entity';
import { SongIngestionController } from './song-ingestion.controller';
import { SongIngestionService } from './song-ingestion.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([StagedPhrase]),
    SongsModule,
    PhrasesModule,
    WordsModule,
  ],
  controllers: [SongIngestionController],
  providers: [SongIngestionService],
})
export class SongIngestionModule {}
