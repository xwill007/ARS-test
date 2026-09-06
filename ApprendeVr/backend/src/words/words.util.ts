/** Funciones puras del dominio `words` — sin efectos secundarios, testeables sin BD/HTTP. */

// El frontend (VREvaluacionAf.js, Requerimiento 009) espera `esp_palabra`/`ing_palabra` — mismos
// nombres que usaba el endpoint PHP legacy (`obtener_palabras.php`) — así que se traduce acá,
// desacoplando el nombre de columna de BD (`spanish`/`english` en la entidad) del contrato HTTP.
export function toWordDto(word: { spanish: string; english: string }): {
  esp_palabra: string;
  ing_palabra: string;
} {
  return { esp_palabra: word.spanish, ing_palabra: word.english };
}
