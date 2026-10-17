import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizeYoutubeSearchResults, YoutubeSearchResult } from './youtube-search.util';

// Cliente de la YouTube Data API v3 (`search.list`) para el overlay "Explore Youtube AR"
// (Requerimiento 017). Proxea la llamada desde el backend para no exponer `YOUTUBE_API_KEY` en el
// frontend (ver requerimiento.md, sección "Diseño técnico"). El endpoint es público y de solo
// lectura; los errores (cuota agotada, key inválida, red caída, key no configurada) se traducen a
// un error controlado para que el frontend pueda mostrarlos, nunca un `500` crudo.

const YOUTUBE_SEARCH_API = 'https://www.googleapis.com/youtube/v3/search';

@Injectable()
export class YoutubeSearchService {
  constructor(private readonly configService: ConfigService) {}

  // Busca videos por texto (una sola página, hasta `maxResults`). Devuelve la lista normalizada
  // `[{ videoId, title, thumbnailUrl, channelTitle }]`. Lanza `ServiceUnavailableException` si no
  // hay API key configurada o si la API de YouTube responde con error (cuota agotada, key inválida,
  // error de red), con un mensaje accionable para el usuario.
  async search(query: string, maxResults = 10): Promise<YoutubeSearchResult[]> {
    const apiKey = this.configService.get<string>('youtube.apiKey', '');
    if (!apiKey) {
      throw new ServiceUnavailableException('Búsqueda de YouTube no configurada (falta YOUTUBE_API_KEY).');
    }

    const url =
      YOUTUBE_SEARCH_API +
      '?part=snippet&type=video&maxResults=' +
      encodeURIComponent(String(maxResults)) +
      '&q=' +
      encodeURIComponent(query) +
      '&key=' +
      encodeURIComponent(apiKey);

    let res: Response;
    try {
      res = await fetch(url);
    } catch (err) {
      throw new ServiceUnavailableException('No se pudo contactar el servicio de búsqueda de YouTube.');
    }

    if (!res.ok) {
      throw new ServiceUnavailableException(
        `La búsqueda de YouTube falló (${res.status}). Verifica la API key y la cuota diaria.`,
      );
    }

    const data = await res.json().catch(() => null);
    return normalizeYoutubeSearchResults(data);
  }
}
