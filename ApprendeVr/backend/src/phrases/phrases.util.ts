/** Funciones puras del dominio `phrases` — sin efectos secundarios, testeables sin BD/HTTP. */

// El frontend (VREvaluacionAf.js, Requerimiento 009) espera `espanol_frase`/`ingles_frase` (sin
// ñ) — mismos nombres que usaba el endpoint PHP legacy (`obtener_frases.php`) — mientras que la
// columna real en BD es `español_frase` (con ñ, mapeada a `spanish` en la entidad). Se traduce
// acá, desacoplando el nombre de columna de BD del contrato HTTP.
export function toPhraseDto(phrase: { spanish: string; english: string }): {
  espanol_frase: string;
  ingles_frase: string;
} {
  return { espanol_frase: phrase.spanish, ingles_frase: phrase.english };
}
