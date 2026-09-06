/** Funciones puras del dominio `user-settings` — sin efectos secundarios, testeables sin BD/HTTP. */

// Vistas conocidas y la columna de `user_settings` donde vive cada una. Agregar una vista nueva
// es agregar una entrada acá (+ su columna en la entidad) y su validador en VALIDATORS.
export const VIEW_COLUMNS = {
  'login-form': 'loginFormConfig',
  'aframe-view': 'aframeViewConfig',
  'evaluation-panel': 'evaluationPanelConfig',
} as const;

export type SettingsView = keyof typeof VIEW_COLUMNS;
export type SettingsColumn = (typeof VIEW_COLUMNS)[SettingsView];

export function isKnownView(view: string): view is SettingsView {
  return Object.prototype.hasOwnProperty.call(VIEW_COLUMNS, view);
}

export function columnForView(view: SettingsView): SettingsColumn {
  return VIEW_COLUMNS[view];
}

function isPositionTuple(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((n) => typeof n === 'number' && Number.isFinite(n))
  );
}

function isPositionedElement(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  return isPositionTuple((value as Record<string, unknown>).position);
}

// login-form: posición del formulario 3D + factor de zoom (ver UbicacionControl, Requerimiento 007).
export function isValidLoginFormConfig(config: unknown): boolean {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  return (
    isPositionTuple(c.position) &&
    typeof c.distanceFactor === 'number' &&
    Number.isFinite(c.distanceFactor) &&
    c.distanceFactor > 0
  );
}

// aframe-view: posición de los elementos ajustables de la vista A-Frame (Requerimiento 009). El
// video del karaoke vive DENTRO del propio panel de karaoke (no es una entidad independiente en
// el DOM), así que no tiene una entrada propia acá — solo karaoke y newSong son posicionables por
// separado.
const AFRAME_VIEW_ELEMENTS = ['karaoke', 'newSong'] as const;

export function isValidAframeViewConfig(config: unknown): boolean {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  return AFRAME_VIEW_ELEMENTS.every((key) => isPositionedElement(c[key]));
}

// evaluation-panel: posición del panel de evaluación dinámico (ver VREvaluacionAf.js,
// Requerimiento 009), que a diferencia de `aframe-view` no tiene un `distanceFactor` — solo
// posición, igual forma que cada elemento de `aframe-view`.
export function isValidEvaluationPanelConfig(config: unknown): boolean {
  return isPositionedElement(config);
}

const VALIDATORS: Record<SettingsView, (config: unknown) => boolean> = {
  'login-form': isValidLoginFormConfig,
  'aframe-view': isValidAframeViewConfig,
  'evaluation-panel': isValidEvaluationPanelConfig,
};

export function isValidConfigForView(view: SettingsView, config: unknown): boolean {
  return VALIDATORS[view](config);
}
