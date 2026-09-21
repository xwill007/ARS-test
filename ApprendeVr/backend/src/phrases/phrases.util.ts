/** Funciones puras del dominio `phrases` — sin efectos secundarios, testeables sin BD/HTTP. */

// El frontend (VREvaluacionAf.js, Requerimiento 009) espera `espanol_frase`/`ingles_frase` (sin
// ñ) — mismos nombres que usaba el endpoint PHP legacy (`obtener_frases.php`) — mientras que la
// columna real en BD es `español_frase` (con ñ, mapeada a `spanish` en la entidad). Se traduce
// acá, desacoplando el nombre de columna de BD del contrato HTTP.
//
// `tiempo_frase` (Requerimiento 015, overlay "SONG TEXT"): se suma al contrato para que el
// frontend pueda sincronizar la letra con el video — el endpoint PHP legacy no lo exponía, pero
// la columna ya existe en la BD (`frases_vr.tiempo_frase`, TIME).
export function toPhraseDto(phrase: {
  spanish: string;
  english: string;
  time?: string | null;
}): {
  espanol_frase: string;
  ingles_frase: string;
  tiempo_frase: string | null;
} {
  return {
    espanol_frase: phrase.spanish,
    ingles_frase: phrase.english,
    tiempo_frase: phrase.time ?? null,
  };
}
