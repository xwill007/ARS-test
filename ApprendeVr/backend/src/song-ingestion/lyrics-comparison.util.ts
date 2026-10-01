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

// Normaliza un texto de letra para compararlo: minúsculas, sin acentos (NFKD), apóstrofes y guiones
// UNIDOS (no convertidos en espacio, para que "broken-hearted" == "brokenhearted" y "ain't" ==
// "aint"), y el resto de la puntuación reemplazada por un solo espacio. Dos textos "iguales" con
// puntuación, mayúsculas o guiones distintos dan el mismo resultado.
export function normalizeLyricText(text: string): string {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/-/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
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

// Palabras funcionales/interjecciones que varían de forma inconsistente entre fuentes (subtítulos
// de YouTube vs LRCLIB): artículos ("a/the"), conjunciones ("and/but") e interjecciones ("oh/yeah").
// Se descartan SOLO para el matcheo (no se tocan en la asignación ni en lo que se muestra), así
// "for the faith-departed" matchea "for faith-departed" y "And I ain't..." matchea "I ain't...".
const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'but',
  'or',
  'oh',
  'ooh',
  'oooh',
  'ohh',
  'yeah',
  'ah',
]);

// Convierte el texto a una secuencia de tokens para comparar: aplica `normalizeLyricText` y después
// descarta las stopwords. Dos textos equivalentes salvo artículos/conjunciones/interjecciones dan la
// misma secuencia de tokens.
export function tokenizeForCompare(text: string): string[] {
  return normalizeLyricText(text)
    .split(' ')
    .filter((t) => t && !STOPWORDS.has(t));
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function isPrefix(prefix: string[], full: string[]): boolean {
  if (prefix.length > full.length) return false;
  for (let i = 0; i < prefix.length; i++) if (prefix[i] !== full[i]) return false;
  return true;
}

// Compara las líneas sincronizadas de LRCLIB (`staged`) contra las frases existentes (`existing`):
// - `assignments`: frases existentes con tiempo 0 que matchean por texto normalizado una línea de
//   LRCLIB → candidatas a recibir ese tiempo.
// - `mismatches`: líneas de LRCLIB que no matchean NINGUNA frase existente (ni con tiempo ni sin
//   él) → texto nuevo que el usuario puede aceptar (insertar) o rechazar.
// Las frases existentes que YA tienen tiempo y matchean una línea de LRCLIB no generan asignación
// (ya están sincronizadas), y esa línea se consume (no aparece como mismatch).
//
// El matcheo es por CONCATENACIÓN de frases consecutivas (Requerimiento 015, pedido del usuario):
// una línea de LRCLIB que representa un verso completo puede corresponder a DOS O MÁS frases
// existentes consecutivas (p. ej. "This ain't a song" + "For the brokenhearted." = "This ain't a
// song for the broken-hearted" de LRCLIB). En ese caso, TODAS las frases del tramo con tiempo 0
// reciben el mismo tiempo de inicio de la línea (sync "grueso"; el ajuste fino sigue con "Edit time").
export function compareLyrics(
  staged: StagedText[],
  existing: ExistingPhraseLike[],
): LyricsComparison {
  const ordered = [...existing].sort((a, b) => a.id - b.id);
  const used = new Set<number>();
  const assignments: ComparisonAssignment[] = [];
  const mismatches: ComparisonMismatch[] = [];

  for (const line of staged) {
    const run = findRunMatch(line.text, ordered, used);
    if (!run) {
      mismatches.push({ text: line.text, startTime: line.startTime });
      continue;
    }
    run.forEach((i) => used.add(i));
    for (const i of run) {
      const phrase = ordered[i];
      if (isZeroTime(phrase.time)) {
        assignments.push({
          phraseId: phrase.id,
          english: phrase.english,
          newTime: secondsToHms(line.startTime),
        });
      }
    }
  }

  return { assignments, mismatches };
}

// Busca en `ordered` (frases ordenadas por id) un tramo de frases CONSECUTIVAS y no consumidas cuyo
// texto, comparado por tokens normalizados (sin stopwords), sea exactamente el de `targetText`.
// Devuelve los índices del tramo, o `null` si ninguna combinación consecutiva lo produce. Es
// greedy: empieza en la primera frase no consumida y va extendiendo hacia adelante mientras el
// acumulado sea prefijo del target.
function findRunMatch(
  targetText: string,
  ordered: ExistingPhraseLike[],
  used: Set<number>,
): number[] | null {
  const target = tokenizeForCompare(targetText);
  if (!target.length) return null;
  for (let i = 0; i < ordered.length; i++) {
    if (used.has(i)) continue;
    const run: number[] = [];
    const acc: string[] = [];
    for (let j = i; j < ordered.length; j++) {
      if (used.has(j)) break;
      const toks = tokenizeForCompare(ordered[j].english);
      if (!toks.length) continue;
      acc.push(...toks);
      run.push(j);
      if (arraysEqual(acc, target)) return run;
      if (acc.length >= target.length) break;
      if (!isPrefix(acc, target)) break;
    }
  }
  return null;
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
// para cada línea, busca un tramo de frases existentes consecutivas no consumidas cuyo texto
// concatenado coincida (ver `findRunMatch`). Si matchea un tramo de varias frases, `currentText`
// las une con espacios (es el verso completo tal como está guardado hoy) y `currentTime` es el
// tiempo de la PRIMERA frase del tramo. Las frases que no matchean ninguna línea no aparecen acá.
export function buildComparisonRows(
  staged: StagedText[],
  existing: ExistingPhraseLike[],
): ComparisonRow[] {
  const ordered = [...existing].sort((a, b) => a.id - b.id);
  const used = new Set<number>();
  const rows: ComparisonRow[] = [];

  for (const line of staged) {
    const run = findRunMatch(line.text, ordered, used);
    if (!run) {
      rows.push({
        newText: line.text,
        newTime: secondsToHms(line.startTime),
        matched: false,
        currentText: '',
        currentTime: null,
      });
      continue;
    }
    run.forEach((i) => used.add(i));
    rows.push({
      newText: line.text,
      newTime: secondsToHms(line.startTime),
      matched: true,
      currentText: run.map((i) => ordered[i].english).join(' '),
      currentTime: ordered[run[0]].time,
    });
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
