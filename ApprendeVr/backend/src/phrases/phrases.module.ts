import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SongsModule } from '../songs/songs.module';
import { Phrase } from './entities/phrase.entity';
import { PhrasesController } from './phrases.controller';
import { PhrasesService } from './phrases.service';

@Module({
  imports: [TypeOrmModule.forFeature([Phrase]), SongsModule],
  controllers: [PhrasesController],
  providers: [PhrasesService],
})
export class PhrasesModule {}
