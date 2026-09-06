import { Controller, Get, Query } from '@nestjs/common';
import { PhrasesService } from './phrases.service';
import { toPhraseDto } from './phrases.util';

@Controller('frases')
export class PhrasesController {
  constructor(private readonly phrasesService: PhrasesService) {}

  @Get()
  async getPhrases(@Query('archivo') archivo?: string) {
    const phrases = await this.phrasesService.findBySongFile(archivo ?? '');
    return { status: 'success', phrases: phrases.map(toPhraseDto) };
  }
}
