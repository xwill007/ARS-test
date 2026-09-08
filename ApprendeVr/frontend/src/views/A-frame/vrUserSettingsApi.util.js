// Cliente mínimo de `/api/user-settings/:view` para esta vista (Requerimiento 010). Reusa la
// sesión ya guardada por el login 3D (`localStorage['apprendevr_auth']`, ver vrAuth.util.js). Sin
// sesión, ambas funciones son no-ops silenciosos: los controles de posición de esta vista siguen
// funcionando en memoria, sin intentar persistir nada.
import { getStoredAuth } from './vrAuth.util.js';

// Requerimiento 012 (ampliación): un mismo usuario puede querer un ajuste distinto en web que en
// móvil (ej. separación/ancho/alto de paneles en SyncConfigMenu.jsx) — el backend guarda una fila
// por (usuario, vista, dispositivo) (ver user-settings.util.ts `KNOWN_DEVICE_TYPES` en el
// backend). Mismo patrón simple de detección por `navigator.userAgent` que ya usa
// `ARSConfigManager.detectDeviceType()` (src/config/ARSConfigManager.js) para AR-TEST, pero
// colapsado a 2 categorías (web/mobile, tablet cuenta como mobile) en vez de 3 — no se reutiliza
// esa clase directamente para no acoplar este cliente genérico a su configuración específica de
// AR-TEST.
export function detectDeviceType() {
  if (typeof navigator === 'undefined' || !navigator.userAgent) return 'web';
  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/.test(ua);
  return isMobile ? 'mobile' : 'web';
}

export async function getUserSetting(view, deviceType = detectDeviceType()) {
  const auth = getStoredAuth();
  if (!auth || !auth.access_token) {
    console.warn(`vrUserSettingsApi: sin sesión (apprendevr_auth) — no se carga "${view}" (${deviceType}).`);
    return null;
  }
  try {
    const res = await fetch(`/api/user-settings/${view}?device=${deviceType}`, {
      headers: { Authorization: `Bearer ${auth.access_token}` },
    });
    if (!res.ok) {
      console.warn(`vrUserSettingsApi: GET "${view}" (${deviceType}) devolvió ${res.status}.`);
      return null;
    }
    return await res.json();
  } catch (e) {
    // Motivo típico de esto en un dispositivo real (no en el navegador de escritorio donde ya se
    // aceptó el certificado): HTTPS autofirmado (ssl/cert.pem, ver vite.config.js) sin confiar en
    // ESE dispositivo — fetch() falla en silencio con un TypeError de red, sin más detalle.
    console.warn(`vrUserSettingsApi: GET "${view}" (${deviceType}) falló de red — ¿certificado HTTPS autofirmado sin confiar en este dispositivo?`, e);
    return null;
  }
}

// Devuelve una Promise<boolean> (éxito/fracaso) para que quien la llame pueda dar feedback visual
// (ver botón "Guardar selección" de SyncConfigMenu.jsx) — los llamadores existentes ignoran el
// valor de retorno (no esperaban nada antes), así que agregarlo no rompe nada.
export function saveUserSetting(view, config, deviceType = detectDeviceType()) {
  const auth = getStoredAuth();
  if (!auth || !auth.access_token) {
    console.warn(`vrUserSettingsApi: sin sesión (apprendevr_auth) — no se guarda "${view}" (${deviceType}).`);
    return Promise.resolve(false);
  }
  return fetch(`/api/user-settings/${view}?device=${deviceType}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.access_token}`,
    },
    body: JSON.stringify({ config }),
  })
    .then((res) => {
      if (!res.ok) {
        console.warn(`vrUserSettingsApi: PUT "${view}" (${deviceType}) devolvió ${res.status}.`);
      }
      return res.ok;
    })
    .catch((e) => {
      // Mismo motivo típico que en getUserSetting: certificado HTTPS autofirmado sin confiar en
      // este dispositivo — el ajuste sigue funcionando en memoria aunque no se guarde.
      console.warn(`vrUserSettingsApi: PUT "${view}" (${deviceType}) falló de red — ¿certificado HTTPS autofirmado sin confiar en este dispositivo?`, e);
      return false;
    });
}
