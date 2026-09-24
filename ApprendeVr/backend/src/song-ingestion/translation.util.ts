// Cliente mínimo de LibreTranslate (Requerimiento 015, traducción de la letra). `translateText` es
// un efecto (fetch al servicio self-hosted), aislado acá para que el orquestador
// (`song-ingestion.service.ts`) pueda mockearlo en tests sin red real. La regla del skill
// backend-nestjs separa esta llamada de la lógica de tokenización (lyrics.util.ts).

// Traduce `text` de `from` a `to` usando la API de LibreTranslate (`POST /translate`). Devuelve el
// texto traducido o lanza si la petición falla (red caída, servicio no levantado, status != 2xx) —
// el llamador decide si eso es "todo o nada" (ver `lyricsFromYoutube`).
export async function translateText(
  baseUrl: string,
  text: string,
  from: string,
  to: string,
): Promise<string> {
  const res = await fetch(`${baseUrl}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: from, target: to, format: 'text' }),
  });
  if (!res.ok) {
    throw new Error(`TRANSLATION_FAILED (${res.status})`);
  }
  const data = await res.json();
  if (!data || typeof data.translatedText !== 'string') {
    throw new Error('TRANSLATION_FAILED (no translatedText)');
  }
  return data.translatedText;
}
