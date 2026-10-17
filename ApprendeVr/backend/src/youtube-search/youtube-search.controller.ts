import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { YoutubeSearchService } from './youtube-search.service';

// Endpoint público `GET /youtube-search?q=<texto>` para el overlay "Explore Youtube AR"
// (Requerimiento 017). Sin `JwtAuthGuard`: es solo lectura y no es un dato por-usuario (mismo
// criterio que `GET /songs`/`GET /frases`). Valida que `q` no esté vacío antes de llamar a la API.
@Controller('youtube-search')
export class YoutubeSearchController {
  constructor(private readonly youtubeSearchService: YoutubeSearchService) {}

  @Get()
  search(@Query('q') q?: string) {
    if (!q || !q.trim()) {
      throw new BadRequestException('Falta el parámetro de búsqueda `q`.');
    }
    return this.youtubeSearchService.search(q.trim());
  }
}
