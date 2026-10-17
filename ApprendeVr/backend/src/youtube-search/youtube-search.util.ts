// Normalización de la respuesta cruda de la YouTube Data API v3 (`search.list`) al formato propio
// del dominio `youtube-search`. La función es pura y testeable sin red (regla del skill
// backend-nestjs: separar lógica de efectos); la llamada HTTP vive en el service.
//
// Formato de entrada (fragmento relevante de la respuesta de
// `GET https://www.googleapis.com/youtube/v3/search?part=snippet&type=video`):
//   {
//     "items": [
//       {
//         "id": { "kind": "youtube#video", "videoId": "abc123" },
//         "snippet": {
//           "title": "Título",
//           "channelTitle": "Canal",
//           "thumbnails": { "medium": { "url": "https://..." }, "default": { "url": "..." } }
//         }
//       }
//     ]
//   }

export interface YoutubeSearchResult {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelTitle: string;
}

// Normaliza la respuesta cruda de la API a una lista `[{ videoId, title, thumbnailUrl,
// channelTitle }]`. Descarta los items que no sean videos (kind !== 'youtube#video' o sin
// `videoId`) y resuelve la miniatura con el mismo criterio progresivo que usa el frontend:
// medium → high → default → cadena vacía. Nunca lanza: ante input malformado devuelve `[]`.
export function normalizeYoutubeSearchResults(raw: unknown): YoutubeSearchResult[] {
  if (!raw || typeof raw !== 'object') return [];
  const items = (raw as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];

  const out: YoutubeSearchResult[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const id = (item as { id?: unknown }).id;
    if (!id || typeof id !== 'object') continue;
    const videoId = (id as { videoId?: unknown }).videoId;
    if (typeof videoId !== 'string' || !videoId) continue;

    const snippet = (item as { snippet?: unknown }).snippet;
    const s = snippet && typeof snippet === 'object' ? (snippet as Record<string, unknown>) : {};
    const title = typeof s.title === 'string' ? s.title : '';
    const channelTitle = typeof s.channelTitle === 'string' ? s.channelTitle : '';
    const thumbnailUrl = pickThumbnailUrl(s.thumbnails);

    out.push({ videoId, title, thumbnailUrl, channelTitle });
  }
  return out;
}

// Resuelve la URL de miniatura de `snippet.thumbnails` con prioridad medium → high → default.
function pickThumbnailUrl(thumbnails: unknown): string {
  if (!thumbnails || typeof thumbnails !== 'object') return '';
  const t = thumbnails as Record<string, unknown>;
  for (const key of ['medium', 'high', 'default']) {
    const candidate = t[key];
    if (candidate && typeof candidate === 'object' && typeof (candidate as { url?: unknown }).url === 'string') {
      return (candidate as { url: string }).url;
    }
  }
  return '';
}
