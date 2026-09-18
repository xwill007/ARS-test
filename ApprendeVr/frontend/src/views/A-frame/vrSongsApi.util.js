// Cliente mínimo de `/api/songs` para esta vista (Requerimiento 014). Mismo patrón que
// vrUserSettingsApi.util.js: lee el JWT ya guardado por el login 3D (vrAuth.util.js) y, ante
// cualquier falla (sin sesión, red caída, backend apagado), no rompe la vista — quien llama decide
// el fallback (VRNewSongAf cae a addLocalSong/localStorage, ver vrSongCatalog.util.js).
import { getStoredAuth } from './vrAuth.util.js';

// Catálogo completo de canciones del backend. Devuelve `[]` (nunca lanza) si falla, para que
// VRKaraokeAf pueda seguir usando su `videoList`/localStorage como respaldo sin manejar excepciones.
export async function getSongs() {
  try {
    const res = await fetch('/api/songs');
    if (!res.ok) {
      console.warn(`vrSongsApi: GET /api/songs devolvió ${res.status}.`);
      return [];
    }
    const songs = await res.json();
    return Array.isArray(songs) ? songs : [];
  } catch (e) {
    // Mismo motivo típico que en vrUserSettingsApi: HTTPS autofirmado no confiado en el
    // dispositivo, o backend apagado.
    console.warn('vrSongsApi: GET /api/songs falló de red.', e);
    return [];
  }
}

// Canciones `source: 'local'` (Requerimiento 014, ampliación) DEL USUARIO AUTENTICADO — no vienen
// en `getSongs()` (catálogo público, ver `SongsService.findAll()`), así que `VRKaraokeAf` las pide
// acá aparte para combinarlas con el catálogo. Igual que `getSongs()`, nunca lanza: sin sesión o
// con el backend caído, devuelve `[]` (esas canciones locales quedan invisibles esa vez, pero no
// se pierden — su metadata sigue en la BD, listas para la próxima vez que haya sesión/red).
export async function getMySongs() {
  const auth = getStoredAuth();
  if (!auth || !auth.access_token) return [];

  try {
    const res = await fetch('/api/songs/mine', {
      headers: { Authorization: `Bearer ${auth.access_token}` },
    });
    if (!res.ok) {
      console.warn(`vrSongsApi: GET /api/songs/mine devolvió ${res.status}.`);
      return [];
    }
    const songs = await res.json();
    return Array.isArray(songs) ? songs : [];
  } catch (e) {
    console.warn('vrSongsApi: GET /api/songs/mine falló de red.', e);
    return [];
  }
}

// song: { title, author, fileName, language, source }. `source` es 'server' (fileName es el
// nombre del archivo en videos/karaoke/ del servidor), 'local' (fileName es la clave bajo la que
// el video quedó guardado en el IndexedDB del dispositivo, ver vrLocalVideoStore.util.js) o
// 'youtube' (fileName es la URL completa). Devuelve { ok: true, song } en éxito,
// { ok: false, error } en falla — `error` es 'NO_SESSION' | 'SONG_ALREADY_EXISTS' | 'NETWORK_ERROR'
// | el código que devuelva el backend, para que el llamador pueda mostrar un mensaje específico
// (ver VRNewSongAf._saveSong).
export async function createSong(song) {
  const auth = getStoredAuth();
  if (!auth || !auth.access_token) {
    console.warn('vrSongsApi: sin sesión (apprendevr_auth) — no se crea la canción.');
    return { ok: false, error: 'NO_SESSION' };
  }

  try {
    const res = await fetch('/api/songs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.access_token}`,
      },
      body: JSON.stringify(song),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const error = (body && body.message) || `HTTP_${res.status}`;
      console.warn(`vrSongsApi: POST /api/songs devolvió ${res.status} (${error}).`);
      return { ok: false, error };
    }
    return { ok: true, song: body };
  } catch (e) {
    console.warn('vrSongsApi: POST /api/songs falló de red.', e);
    return { ok: false, error: 'NETWORK_ERROR' };
  }
}
