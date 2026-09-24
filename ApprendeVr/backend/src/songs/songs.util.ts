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

// ---------------------------------------------------------------------------------------------
// Multi-source (Requerimiento 015, ampliación): `fuente_cancion` deja de ser un valor único y
// pasa a ser una lista separada por comas (p. ej. `youtube,server`), para que una canción
// descargada desde YouTube a servidor/dispositivo conserve a la vez su origen (`youtube`, que
// habilita el botón "YouTube" en la lista) y su forma de reproducción (`server`/`local`). Las
// funciones de abajo normalizan/consultan esa lista sin depender del orden.
// ---------------------------------------------------------------------------------------------

// Normaliza `fuente_cancion` (string separado por comas o array) a una lista sin duplicados ni
// vacíos, en el orden en que aparecen.
export function normalizeSources(
  input: string | string[] | null | undefined,
): string[] {
  if (!input) return [];
  const list = Array.isArray(input) ? input : String(input).split(',');
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const value = (raw == null ? '' : String(raw)).trim();
    if (value && !seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}

// Serializa una lista de fuentes a su forma persistida (string separado por comas, sin duplicados).
export function serializeSources(
  input: string | string[] | null | undefined,
): string {
  return normalizeSources(input).join(',');
}

// ¿La lista de fuentes contiene `target`?
export function hasSource(
  input: string | string[] | null | undefined,
  target: string,
): boolean {
  return normalizeSources(input).includes(target);
}

// Devuelve la lista de fuentes con `target` agregado (idempotente: no duplica) como string
// separado por comas, lista para persistir.
export function addSource(
  input: string | string[] | null | undefined,
  target: string,
): string {
  const list = normalizeSources(input);
  if (!list.includes(target)) list.push(target);
  return list.join(',');
}
