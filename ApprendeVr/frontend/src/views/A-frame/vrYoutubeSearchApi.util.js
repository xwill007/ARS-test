// Cliente mínimo de `GET /api/youtube-search` para el overlay "Explore Youtube AR"
// (Requerimiento 017). Sin autenticación (mismo criterio que `getSongs()` en vrSongsApi.util.js:
// la búsqueda no es un dato por-usuario y el endpoint del backend es público). Devuelve
// `[]` (nunca lanza) ante cualquier falla (sin backend, red caída, key no configurada, cuota
// agotada) para que el overlay pueda mostrar su propio estado de error sin excepciones; el
// `error` devuelto permite distinguir "no hay resultados" de "falló la búsqueda".

// query: texto a buscar. Devuelve `{ ok: true, results: [...] }` en éxito (results es un array de
// `{ videoId, title, thumbnailUrl, channelTitle }`) o `{ ok: false, error }` en falla — `error` es
// un mensaje corto para mostrar al usuario ('NO_QUERY' | 'BACKEND_ERROR' | 'NETWORK_ERROR' |
// 'NOT_CONFIGURED' | 'EMPTY').
export async function searchYoutube(query) {
  const q = (query || '').trim();
  if (!q) {
    return { ok: false, error: 'NO_QUERY' };
  }

  try {
    const res = await fetch('/api/youtube-search?q=' + encodeURIComponent(q));
    if (!res.ok) {
      console.warn(`vrYoutubeSearchApi: GET /api/youtube-search devolvió ${res.status}.`);
      // 503 es el caso "búsqueda no configurada" (sin YOUTUBE_API_KEY) o "la API de YouTube falló".
      if (res.status === 503) return { ok: false, error: 'NOT_CONFIGURED' };
      return { ok: false, error: 'BACKEND_ERROR' };
    }
    const results = await res.json();
    return { ok: true, results: Array.isArray(results) ? results : [] };
  } catch (e) {
    console.warn('vrYoutubeSearchApi: GET /api/youtube-search falló de red.', e);
    return { ok: false, error: 'NETWORK_ERROR' };
  }
}

// Fallback de búsqueda sin API key usando la API pública de Invidious (frontends libres de
// YouTube). No requiere key ni cuota: se consulta directamente una instancia de terceros. Es la
// alternativa que ofrece el overlay "Explore Youtube AR" cuando el backend devuelve `NOT_CONFIGURED`
// (falta `YOUTUBE_API_KEY`). Se usa SOLO como fallback y no reemplaza la YouTube Data API: las
// instancias públicas cambian/se caen seguido y van contra los ToS de YouTube; además la lista no
// tiene la personalización de la sesión real del usuario. Mismo contrato de retorno que
// `searchYoutube`: `{ ok: true, results }` o `{ ok: false, error }` (`error` en 'NO_QUERY' |
// 'INVIDIOUS_ERROR').

// Lista corta de instancias probadas en orden. Si una no responde (caída, timeout, bloqueo) se
// prueba la siguiente. Puede actualizarse sin tocar el resto del código.
const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://yewtu.be',
  'https://invidious.nerdvpn.de',
  'https://invidious.f5.si',
];

const INVIDIOUS_TIMEOUT_MS = 8000;

// fetch con timeout propio (sin depender de `AbortSignal.timeout`, más ampliamente soportado).
function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

// Resuelve la URL de miniatura de `item.videoThumbnails` (estructura de Invidious: array de
// `{ quality, url, width, height }`), con prioridad medium → high → default → mqdefault → hqdefault
// → la primera disponible. Devuelve '' si no hay ninguna.
function pickInvidiousThumbnail(videoThumbnails) {
  if (!Array.isArray(videoThumbnails) || !videoThumbnails.length) return '';
  const byQuality = {};
  for (const t of videoThumbnails) {
    if (t && typeof t === 'object' && typeof t.url === 'string' && typeof t.quality === 'string') {
      byQuality[t.quality] = t.url;
    }
  }
  for (const key of ['medium', 'high', 'default', 'mqdefault', 'hqdefault']) {
    if (byQuality[key]) return byQuality[key];
  }
  const first = videoThumbnails.find((t) => t && typeof t.url === 'string');
  return first ? first.url : '';
}

// Normaliza la respuesta de Invidious (`GET /api/v1/search?type=video`) al mismo formato que
// devuelve el backend: `[{ videoId, title, thumbnailUrl, channelTitle }]`. En Invidious el canal se
// llama `author` (no `channelTitle`) y las miniaturas viven en `videoThumbnails`. Nunca lanza: ante
// input malformado devuelve `[]`.
function normalizeInvidiousResults(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    if (item.type && item.type !== 'video') continue;
    const videoId = typeof item.videoId === 'string' ? item.videoId : '';
    if (!videoId) continue;
    out.push({
      videoId,
      title: typeof item.title === 'string' ? item.title : '',
      thumbnailUrl: pickInvidiousThumbnail(item.videoThumbnails),
      channelTitle: typeof item.author === 'string' ? item.author : '',
    });
  }
  return out;
}

// query: texto a buscar. Devuelve `{ ok: true, results: [...] }` en éxito (mismo formato que el
// backend) o `{ ok: false, error: 'NO_QUERY' | 'INVIDIOUS_ERROR' }` si todas las instancias fallan.
export async function searchYoutubeInvidious(query) {
  const q = (query || '').trim();
  if (!q) {
    return { ok: false, error: 'NO_QUERY' };
  }

  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetchWithTimeout(
        base + '/api/v1/search?type=video&q=' + encodeURIComponent(q),
        INVIDIOUS_TIMEOUT_MS,
      );
      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      if (!Array.isArray(data)) continue;
      return { ok: true, results: normalizeInvidiousResults(data) };
    } catch (e) {
      // Instancia caída / timeout / bloqueo de CORS → probar la siguiente.
      console.warn('vrYoutubeSearchApi: instancia Invidious falló.', base, e);
    }
  }
  console.warn('vrYoutubeSearchApi: ninguna instancia Invidious respondió.');
  return { ok: false, error: 'INVIDIOUS_ERROR' };
}
