// Catálogo local de canciones agregadas desde el panel VRNewSongAf.
//
// ApprendeVr no tiene todavía un backend de canciones (no existe módulo `canciones` en
// `ApprendeVr/backend/src`, ver Requerimiento 009, sección "No incluido"), así que las canciones
// agregadas en esta sesión de navegador se guardan en localStorage en vez de perderse.
// VRKaraokeAf las combina con su `videoList` (schema) para armar la lista completa.
const SONGS_STORAGE_KEY = 'apprendevr_canciones';

export function getLocalSongs() {
  try {
    const raw = localStorage.getItem(SONGS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

// song: { titulo, autor, archivo }. Si ya existe una canción con el mismo `archivo`, la reemplaza
// en vez de duplicarla.
export function addLocalSong(song) {
  const songs = getLocalSongs().filter((s) => s.archivo !== song.archivo);
  songs.push(song);
  try {
    localStorage.setItem(SONGS_STORAGE_KEY, JSON.stringify(songs));
  } catch (e) {
    /* localStorage no disponible (modo privado, cuota excedida): la canción queda solo en memoria */
  }
  return songs;
}
