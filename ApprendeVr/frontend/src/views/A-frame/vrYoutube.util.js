// Extrae el video ID de las formas usuales de URL de YouTube (watch?v=, youtu.be/, embed/,
// shorts/). Devuelve null si no matchea ningun formato conocido. Compartido entre VRNewSongAf.js
// (preview del campo YouTube URL) y VRKaraokeAf.js (reproducción de canciones `source: 'youtube'`,
// Requerimiento 014 ampliación).
export function extractYoutubeVideoId(url) {
  const match = String(url || '').match(
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
  );
  return match ? match[1] : null;
}
