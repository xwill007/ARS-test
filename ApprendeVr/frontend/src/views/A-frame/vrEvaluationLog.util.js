// Registro local de evaluaciones (VREvaluacionAf).
//
// ApprendeVr no tiene todavía un backend de evaluaciones (no existe módulo `evaluaciones` en
// `ApprendeVr/backend/src`, ver Requerimiento 009, sección "No incluido"), así que el resultado de
// cada evaluación se guarda en localStorage en vez de perderse, y las "evaluaciones previas" que
// muestra el panel se leen del mismo lugar.
const EVALUATIONS_STORAGE_KEY = 'apprendevr_evaluaciones';

function readAll() {
  try {
    const raw = localStorage.getItem(EVALUATIONS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

// entry: { archivo, total, nota_evaluacion, terminado, nivel }
export function saveLocalEvaluation(entry) {
  const all = readAll();
  all.push({ ...entry, fecha_hora: new Date().toISOString() });
  try {
    localStorage.setItem(EVALUATIONS_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    /* localStorage no disponible: la evaluación queda solo en memoria */
  }
  return all;
}

// Evaluaciones guardadas de `archivo`, más recientes primero.
export function getLocalEvaluations(archivo) {
  return readAll()
    .filter((e) => e.archivo === archivo)
    .sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));
}
