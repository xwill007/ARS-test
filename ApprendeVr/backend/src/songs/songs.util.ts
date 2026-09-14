// Normaliza título/autor para comparar duplicados de forma consistente (mismo criterio que el
// legacy `registrar_canciones.php`: trim + colapsar espacios internos), sin mutar lo que se
// guarda en la BD tal cual lo escribió el usuario.
export function normalizeSongText(value: string | undefined | null): string {
  if (!value) return '';
  return value.trim().replace(/\s+/g, ' ');
}

// Criterio de duplicado: mismo título + mismo autor, normalizados. `author` vacío/ausente se
// normaliza a `''`, así dos canciones sin autor con el mismo título también cuentan como
// duplicado (igual que la `UNIQUE KEY (titulo_cancion, autor_cancion)` del legacy).
export function buildDuplicateCriteria(
  title: string,
  author: string | undefined | null,
): { title: string; author: string } {
  return {
    title: normalizeSongText(title),
    author: normalizeSongText(author),
  };
}
