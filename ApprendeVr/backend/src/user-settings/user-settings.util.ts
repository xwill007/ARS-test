/** Funciones puras del dominio `user-settings` — sin efectos secundarios, testeables sin BD/HTTP. */

// Vistas conocidas — lista estática, pura y testeable sin BD (a propósito: la validación de "qué
// vista existe" y "qué forma tiene su config" no depende de una consulta a la base). El catálogo
// `settings_views` (ver settings-view.entity.ts / migración 004) es la contraparte relacional que
// usa `user-settings.service.ts` para resolver el `view_id` de la fila — ambas listas deben
// mantenerse en sincronía manualmente al agregar una vista nueva, mismo criterio que ya regía
// antes para `VIEW_COLUMNS`/la columna SQL correspondiente.
export const KNOWN_VIEWS = [
  'login-form',
  'aframe-view',
  'evaluation-panel',
  'ars-sync-overlays',
  'ars-sync-config',
  'ars-sync-compass-position',
  'ars-sync-cursor',
] as const;

export type SettingsView = (typeof KNOWN_VIEWS)[number];

export function isKnownView(view: string): view is SettingsView {
  return (KNOWN_VIEWS as readonly string[]).includes(view);
}

// Requerimiento 012 (ampliación): un usuario puede querer un ajuste distinto en web que en móvil
// (ej. separación/ancho/alto de paneles) — `device_type` es parte de la clave de la fila en
// `user_settings` (ver migración 006-user-settings-device-type.sql). Sin `device` en la
// query string se asume `'web'` (mismo default que usa la columna a nivel de BD para las filas
// guardadas antes de esta migración).
export const KNOWN_DEVICE_TYPES = ['web', 'mobile'] as const;

export type DeviceType = (typeof KNOWN_DEVICE_TYPES)[number];

export function isKnownDeviceType(deviceType: string): deviceType is DeviceType {
  return (KNOWN_DEVICE_TYPES as readonly string[]).includes(deviceType);
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
// el DOM), así que no tiene una entrada propia acá. `songList` es la lista de canciones (también
// dentro del panel de karaoke, pero posicionable por separado vía this._videoListContainer de
// VRKaraokeAf.js) — karaoke, songList y newSong son posicionables por separado.
// `youtubeVideo` (Requerimiento 015): ancla del overlay "Youtube Video" de mirror-fix
// (`#youtube-video-anchor`, ver vrPositionControl.js).
// `songText` (Requerimiento 015): ancla del overlay "Song Text" de mirror-fix
// (`#song-text-anchor`) — mismo criterio que `youtubeVideo`. `songTextEdit`: ancla del panel de
// edición de tiempos del mismo overlay (`#song-text-edit-anchor`), posicionable por separado; el
// panel "Add text song" comparte esta misma ancla/posición.
const AFRAME_VIEW_ELEMENTS = ['karaoke', 'songList', 'newSong', 'youtubeVideo', 'songText', 'songTextEdit'] as const;

export function isValidAframeViewConfig(config: unknown): boolean {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  const presentKeys = AFRAME_VIEW_ELEMENTS.filter((key) => key in c);
  if (presentKeys.length === 0) return false;
  return presentKeys.every((key) => isPositionedElement(c[key]));
}

// evaluation-panel: posición del panel de evaluación dinámico (ver VREvaluacionAf.js,
// Requerimiento 009), que a diferencia de `aframe-view` no tiene un `distanceFactor` — solo
// posición, igual forma que cada elemento de `aframe-view`.
export function isValidEvaluationPanelConfig(config: unknown): boolean {
  return isPositionedElement(config);
}

// ars-sync-overlays: qué overlays quedan marcados en el menú de la vista de prueba "AR-SYNC"
// (SyncConfigCompassMenu.jsx/SyncStereoTestView.jsx, Requerimiento 012) — una lista de claves
// conocidas, sin duplicados exigidos ni orden particular. `youtubeVideo` (Requerimiento 015):
// overlay nuevo "Youtube Video" — sin esta clave acá, marcarlo y pulsar "Guardar selección"
// devolvería 400 (mismo tipo de bug ya documentado para `AFRAME_VIEW_ELEMENTS` de arriba).
// `newSong` (Requerimiento 014, ampliación): overlay "New Song" separado de `karaoke` — mismo
// motivo, mismo tipo de bug si se omite acá. `songText` (Requerimiento 015): overlay "Song Text"
// (letra sincronizada) — igual criterio, sin esta clave "Guardar selección" devuelve 400.
const ARS_SYNC_OVERLAY_KEYS = ['camera', 'video', 'cone', 'karaoke', 'youtubeVideo', 'newSong', 'songText'] as const;

export function isValidArsSyncOverlaysConfig(config: unknown): boolean {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  return (
    Array.isArray(c.selectedOverlays) &&
    c.selectedOverlays.every(
      (key) =>
        typeof key === 'string' &&
        (ARS_SYNC_OVERLAY_KEYS as readonly string[]).includes(key),
    )
  );
}

// ars-sync-config: separación/ancho/alto de los paneles de la vista de prueba "AR-SYNC" (pestaña
// "Configuración" de SyncConfigMenu.jsx, Requerimiento 012) — tres números positivos y finitos.
export function isValidArsSyncConfigConfig(config: unknown): boolean {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  const isPositiveFiniteNumber = (n: unknown) =>
    typeof n === 'number' && Number.isFinite(n) && n >= 0;
  return (
    isPositiveFiniteNumber(c.separation) &&
    isPositiveFiniteNumber(c.panelWidth) &&
    isPositiveFiniteNumber(c.panelHeight)
  );
}

// ars-sync-compass-position: posición 3D de la brújula de la vista de prueba "AR-SYNC" (widget 📍
// + d-pad de SyncConfigCompassMenu.jsx, Requerimiento 013) — una tupla `{x, y, z}` de números
// finitos (sin restricción de signo: la brújula puede quedar en cualquier octante del espacio).
export function isValidArsSyncCompassPositionConfig(config: unknown): boolean {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  const isFiniteNumber = (n: unknown) => typeof n === 'number' && Number.isFinite(n);
  return isFiniteNumber(c.x) && isFiniteNumber(c.y) && isFiniteNumber(c.z);
}

// ars-sync-cursor (Requerimiento 016): apariencia y comportamiento del cursor/reticle visible de
// AR-SYNC (`#main-cursor`, hijo de la cámara — `position` acá es un offset relativo a la cámara,
// no una coordenada de mundo como en `ars-sync-compass-position`). `fuseTimeout` es el tiempo de
// activación por mirada fija (dwell) en milisegundos, compartido con los overlays de karaoke/
// new-song/video que tienen su propia copia hardcodeada del mismo valor hoy (ver
// `aframe-overlay-modules.js`/`youtube-video-modules.js`/`VRLocalVideoOverlaySync.jsx`).
const CURSOR_GEOMETRIES = ['point', 'square', 'triangle', 'cross'] as const;

export function isValidArsSyncCursorConfig(config: unknown): boolean {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  const isFiniteNumber = (n: unknown) => typeof n === 'number' && Number.isFinite(n);
  return (
    isPositionTuple(c.position) &&
    isFiniteNumber(c.scale) &&
    (c.scale as number) > 0 &&
    isFiniteNumber(c.fuseTimeout) &&
    (c.fuseTimeout as number) > 0 &&
    typeof c.color === 'string' &&
    c.color.length > 0 &&
    (CURSOR_GEOMETRIES as readonly string[]).includes(c.geometry as string) &&
    typeof c.visible === 'boolean'
  );
}

const VALIDATORS: Record<SettingsView, (config: unknown) => boolean> = {
  'login-form': isValidLoginFormConfig,
  'aframe-view': isValidAframeViewConfig,
  'evaluation-panel': isValidEvaluationPanelConfig,
  'ars-sync-overlays': isValidArsSyncOverlaysConfig,
  'ars-sync-config': isValidArsSyncConfigConfig,
  'ars-sync-compass-position': isValidArsSyncCompassPositionConfig,
  'ars-sync-cursor': isValidArsSyncCursorConfig,
};

export function isValidConfigForView(view: SettingsView, config: unknown): boolean {
  return VALIDATORS[view](config);
}
