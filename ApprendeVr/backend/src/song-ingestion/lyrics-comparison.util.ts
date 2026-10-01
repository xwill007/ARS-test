// Lógica pura de comparación entre la letra sincronizada de LRCLIB y las frases existentes de una
// canción (Requerimiento 015, botón "GET TEXT LYRICS"). Sin efectos, testeable sin BD/HTTP.
//
// Objetivo: asignar tiempos a las frases que hoy están en 00:00:00.0 mapeándolas por TEXTO a las
// líneas sincronizadas de LRCLIB, y detectar el texto que NO concuerda (líneas de LRCLIB sin frase
// equivalente) para que el usuario decida aceptarlo o rechazarlo antes de reemplazar.

import { secondsToHms } from './youtube-captions.util';

export interface ExistingPhraseLike {
  id: number;
  english: string;
  time: string;
}

export interface ComparisonAssignment {
  phraseId: number;
  english: string;
  newTime: string;
}

export interface ComparisonMismatch {
  text: string;
  startTime: number;
}

export interface LyricsComparison {
  assignments: ComparisonAssignment[];
  mismatches: ComparisonMismatch[];
}

// Normaliza un texto de letra para compararlo: minúsculas, sin acentos (NFKD), y dejando solo
// caracteres alfanuméricos separados por un espacio (quita apóstrofes, comas, ♪, etc.). Dos textos
// "iguales" con puntuación o mayúsculas distintas dan el mismo resultado.
export function normalizeLyricText(text: string): string {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// 'HH:MM:SS.d' (columna TIME de MySQL) → segundos float. Devuelve NaN si no matchea el formato.
export function timeStringToSeconds(time: string): number {
  const m = String(time || '').trim().match(/^(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (!m) return NaN;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const s = parseInt(m[3], 10);
  const ms = m[4] ? parseInt(m[4].padEnd(3, '0'), 10) : 0;
  return h * 3600 + min * 60 + s + ms / 1000;
}

// Verdadero si la frase está sin sincronizar (tiempo 0 o ausente). `time` llega como '00:00:00.0'
// desde la entidad `Phrase` (columna `tiempo_frase`, TIME(1) — ver db/013).
export function isZeroTime(time: string | null | undefined): boolean {
  if (!time) return true;
  const sec = timeStringToSeconds(time);
  return Number.isFinite(sec) && sec === 0;
}

// Compara las líneas sincronizadas de LRCLIB (`staged`) contra las frases existentes (`existing`):
// - `assignments`: frases existentes con tiempo 0 que matchean por texto normalizado una línea de
//   LRCLIB → candidatas a recibir ese tiempo.
// - `mismatches`: líneas de LRCLIB que no matchean NINGUNA frase existente (ni con tiempo ni sin
//   él) → texto nuevo que el usuario puede aceptar (insertar) o rechazar.
// Las frases existentes que YA tienen tiempo y matchean una línea de LRCLIB no generan asignación
// (ya están sincronizadas), y esa línea se consume (no aparece como mismatch).
export function compareLyrics(
  staged: StagedText[],
  existing: ExistingPhraseLike[],
): LyricsComparison {
  const assignments: ComparisonAssignment[] = [];
  const usedStaged = new Set<number>();

  for (const phrase of existing) {
    const phraseNorm = normalizeLyricText(phrase.english);
    if (!phraseNorm) continue;
    const idx = staged.findIndex(
      (s, i) => !usedStaged.has(i) && normalizeLyricText(s.text) === phraseNorm,
    );
    if (idx === -1) continue;
    usedStaged.add(idx);
    if (isZeroTime(phrase.time)) {
      assignments.push({
        phraseId: phrase.id,
        english: phrase.english,
        newTime: secondsToHms(staged[idx].startTime),
      });
    }
  }

  const mismatches: ComparisonMismatch[] = staged
    .filter((_, i) => !usedStaged.has(i))
    .map((s) => ({ text: s.text, startTime: s.startTime }));

  return { assignments, mismatches };
}

// Fila alineada para la UI de comparación "NEW vs CURRENT" (Requerimiento 015, botón "GET TEXT
// LYRICS"): por cada línea de LRCLIB (ordenada por tiempo), el texto y tiempo NUEVOS, y —si matchea
// una frase existente por texto normalizado— el texto y tiempo ACTUALES de esa frase. Si no matchea,
// `matched` es false y `currentText`/`currentTime` quedan vacíos (la fila es una línea nueva).
export interface ComparisonRow {
  newText: string;
  newTime: string;
  matched: boolean;
  currentText: string;
  currentTime: string | null;
}

// Construye la lista de filas para la comparación lado a lado. Itera sobre `staged` (en orden) y,
// para cada línea, busca una frase existente no consumida cuyo texto normalizado coincida. Las
// frases existentes que matchean se consumen una vez (mismo criterio que `compareLyrics`); las que
// no matchean ninguna línea de LRCLIB no aparecen acá (el usuario compara lo que LRCLIB detectó).
export function buildComparisonRows(
  staged: StagedText[],
  existing: ExistingPhraseLike[],
): ComparisonRow[] {
  const used = new Set<number>();
  const rows: ComparisonRow[] = [];

  for (const line of staged) {
    const norm = normalizeLyricText(line.text);
    const idx = existing.findIndex(
      (p, i) => !used.has(i) && normalizeLyricText(p.english) === norm,
    );
    if (idx === -1) {
      rows.push({
        newText: line.text,
        newTime: secondsToHms(line.startTime),
        matched: false,
        currentText: '',
        currentTime: null,
      });
    } else {
      used.add(idx);
      rows.push({
        newText: line.text,
        newTime: secondsToHms(line.startTime),
        matched: true,
        currentText: existing[idx].english,
        currentTime: existing[idx].time,
      });
    }
  }

  return rows;
}

// Tipado mínimo re-exportado para que el service no tenga que importar la interfaz de lrclib.util
// directamente (evita acoplar el contrato HTTP con el de comparación). Coincide estructuralmente
// con `StagedLyric` de lrclib.util.ts.
export interface StagedText {
  text: string;
  startTime: number;
}
