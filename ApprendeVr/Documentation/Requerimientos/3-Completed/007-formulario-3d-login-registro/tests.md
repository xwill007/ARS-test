# Estrategia y casos de test

## Estrategia

- **Frontend — unit:** funciones puras de validación de `LoginRegisterForm` (formato de email,
  longitud de contraseña, coincidencia de confirmación) probadas sin renderizar componentes.
  Render básico de `Boton`/`Input`/`Formulario` (props → salida esperada).
- **Backend — unit (Jest, sin BD):** funciones puras de `auth.util.ts` (normalización de email,
  validación de payload) y `auth.service.spec.ts` con el `Repository<User>` mockeado (login OK,
  login credenciales inválidas, register email duplicado, register OK), siguiendo la skill
  `backend-nestjs` (nada debe requerir levantar MySQL).
- **Integración (manual/curl, con MySQL levantado):** secuencia
  `POST /api/auth/register` → `POST /api/auth/login` → `GET /api/users/me` contra el backend real.
- **E2E manual (navegador):** abrir la home, activar el formulario 3D embebido en la escena,
  completar registro, verificar sesión persistida tras recargar, cerrar sesión, volver a iniciar
  sesión.

## Casos de test

| Caso | Tipo | Estado |
|---|---|---|
| `Boton` renderiza `label` y dispara `onClick` | Unit (frontend) | Pendiente |
| `Input` propaga `onChange` y muestra `error` | Unit (frontend) | Pendiente |
| `Formulario` invoca `onSubmit` con los valores de sus `Input` hijos | Unit (frontend) | Pendiente |
| Validación: email con formato inválido rechaza el submit | Unit (frontend) | Pendiente |
| Validación: contraseña corta rechaza el submit | Unit (frontend) | Pendiente |
| Validación: confirmación de contraseña no coincide rechaza el submit (modo registro) | Unit (frontend) | Pendiente |
| `AuthContext` persiste y rehidrata el token desde `localStorage` | Unit (frontend) | Pendiente |
| `auth.util.ts`: normalización de email (trim/lowercase) | Unit (backend) | Pendiente |
| `AuthService.login` con credenciales válidas devuelve `access_token` | Unit (backend, repo mockeado) | Pendiente |
| `AuthService.login` con credenciales inválidas lanza `401`/error controlado | Unit (backend, repo mockeado) | Pendiente |
| `AuthService.register` con email duplicado lanza error (no crea usuario) | Unit (backend, repo mockeado) | Pendiente |
| `AuthService.register` hashea la contraseña con bcrypt antes de guardar | Unit (backend, repo mockeado) | Pendiente |
| `GET /api/users/me` sin token responde `401` | Integración (curl) | Pendiente |
| `GET /api/users/me` con token válido devuelve usuario sin `password` | Integración (curl) | Pendiente |
| Flujo completo registro→login→me contra backend real | Integración (curl) | Pendiente |
| Formulario 3D visible/oculto al alternar el nuevo `VRButton` | E2E manual | Pendiente |
| Registro exitoso deja sesión iniciada sin recargar | E2E manual | Pendiente |
| Sesión persiste tras recargar la página (F5) | E2E manual | Pendiente |
| Mensajes de error se muestran en `es`/`en`/`br` según idioma activo | E2E manual | Pendiente |
