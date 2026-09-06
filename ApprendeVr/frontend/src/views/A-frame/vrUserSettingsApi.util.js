// Cliente mínimo de `/api/user-settings/:view` para esta vista (Requerimiento 010). Reusa la
// sesión ya guardada por el login 3D (`localStorage['apprendevr_auth']`, ver vrAuth.util.js). Sin
// sesión, ambas funciones son no-ops silenciosos: los controles de posición de esta vista siguen
// funcionando en memoria, sin intentar persistir nada.
import { getStoredAuth } from './vrAuth.util.js';

export async function getUserSetting(view) {
  const auth = getStoredAuth();
  if (!auth || !auth.access_token) return null;
  try {
    const res = await fetch(`/api/user-settings/${view}`, {
      headers: { Authorization: `Bearer ${auth.access_token}` },
    });
    return res.ok ? await res.json() : null;
  } catch (e) {
    return null;
  }
}

export function saveUserSetting(view, config) {
  const auth = getStoredAuth();
  if (!auth || !auth.access_token) return;
  fetch(`/api/user-settings/${view}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.access_token}`,
    },
    body: JSON.stringify({ config }),
  }).catch(() => { /* el ajuste sigue funcionando en memoria aunque no se guarde */ });
}
