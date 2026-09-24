// Funciones puras de la ingesta de letra (Requerimiento 015) — sin efectos, testeables sin red/BD.

// Convierte el texto de una frase en una lista de palabras únicas (en orden de aparición), en
// minúsculas — mismo criterio que el dump legacy de `palabras_vr` (todo en minúsculas). Mantiene el
// apóstrofo dentro de la palabra (contracciones como "i'll"/"can't" quedan como una sola token) y
// descarta tokens que no tengan al menos una letra. Deduplica dentro de la misma frase (cada
// palabra aparece una vez por frase, como en los datos legacy).
export function tokenizeWords(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of String(text || '').toLowerCase().split(/[^a-z0-9']+/)) {
    const word = raw.replace(/^'+|'+$/g, '');
    if (!word || !/[a-z]/.test(word)) continue;
    if (seen.has(word)) continue;
    seen.add(word);
    out.push(word);
  }
  return out;
}
