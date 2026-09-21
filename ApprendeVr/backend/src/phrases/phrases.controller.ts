import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { CreatePhraseDto } from './dto/create-phrase.dto';
import { UpdatePhraseTimeDto } from './dto/update-phrase-time.dto';
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

  // Alta de frase (overlay "Song Text", "ADD TEXT SONG" — pedido del usuario): `POST /frases` con
  // `{ archivo, ingles_frase, espanol_frase, tiempo_frase? }`. Sin `JwtAuthGuard`, igual que
  // `GET /frases`/`PATCH /frases/:id/time` (mismo criterio que el resto de este módulo).
  @Post()
  async createPhrase(@Body() dto: CreatePhraseDto) {
    const phrase = await this.phrasesService.create(dto);
    return { status: 'success', phrase: toPhraseDto(phrase) };
  }

  // Edición del tiempo de una frase (overlay "Song Text", Requerimiento 015): `PATCH /frases/:id/time`
  // con `{ time: 'HH:MM:SS' }`. Sin `JwtAuthGuard` a propósito, igual que `GET /frases` (catálogo
  // público de la vista A-Frame) — la edición de tiempos es parte del flujo de experimentación de
  // mirror-fix, no un alta de contenido restringida por usuario (ese criterio ya lo aplica
  // `POST /songs`, ver SongsController).
  @Patch(':id/time')
  async updateTime(@Param('id') id: string, @Body() dto: UpdatePhraseTimeDto) {
    const phrase = await this.phrasesService.updateTime(Number(id), dto.time);
    if (!phrase) throw new NotFoundException('PHRASE_NOT_FOUND');
    return { status: 'success', phrase: toPhraseDto(phrase) };
  }
}
