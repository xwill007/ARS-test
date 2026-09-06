// Utilidad compartida por los paneles locales de esta vista (VRKaraokeAf, VREvaluacionAf) para
// mostrar el usuario real de la sesión ApprendeVr. Reemplaza al endpoint PHP legacy
// (`current_user.php`, con cookie de sesión) usado por el proyecto de origen: el login/registro 3D
// (Requerimiento 007) guarda `{ access_token, user }` en localStorage['apprendevr_auth'] al iniciar
// sesión, y el backend NestJS expone `GET /api/users/me` protegido con ese JWT.
const AUTH_STORAGE_KEY = 'apprendevr_auth';

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// Llama a onUser(user) solo si hay sesión guardada y el backend confirma el token. El llamador
// debe mostrar un valor por defecto (p. ej. "Guest") antes de invocar esta función, ya que no
// llama a onUser en ningún caso de error (sin sesión, token vencido, backend caído).
export function fetchCurrentUser(onUser) {
  const auth = getStoredAuth();
  if (!auth || !auth.access_token) return;

  fetch('/api/users/me', {
    headers: { Authorization: `Bearer ${auth.access_token}` },
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((user) => {
      if (user && user.id) onUser(user);
    })
    .catch(() => { /* sin sesión válida o backend no disponible: se mantiene el valor por defecto */ });
}
