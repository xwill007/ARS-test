import { Module } from '@nestjs/common';
import { YoutubeSearchController } from './youtube-search.controller';
import { YoutubeSearchService } from './youtube-search.service';

@Module({
  controllers: [YoutubeSearchController],
  providers: [YoutubeSearchService],
})
export class YoutubeSearchModule {}
