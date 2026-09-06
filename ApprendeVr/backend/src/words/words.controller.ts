import { Controller, Get, Query } from '@nestjs/common';
import { toWordDto } from './words.util';
import { WordsService } from './words.service';

@Controller('palabras')
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Get()
  async getWords(@Query('archivo') archivo?: string) {
    const words = await this.wordsService.findBySongFile(archivo ?? '');
    return { status: 'success', words: words.map(toWordDto) };
  }
}
