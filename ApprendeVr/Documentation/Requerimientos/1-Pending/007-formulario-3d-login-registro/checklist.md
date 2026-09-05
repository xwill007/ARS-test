# Checklist de ejecución (paso a paso)

### Fase 1 — Componentes atómicos reutilizables (frontend)

- [x] 1.1 `frontend/src/components/Boton/Boton.jsx` + `index.js`: botón HTML genérico
      (`label`, `onClick`, `type`, `disabled`, `variant`).
- [x] 1.2 `frontend/src/components/Input/Input.jsx` + `index.js`: input HTML genérico
      (`type`, `name`, `value`, `onChange`, `placeholder`, `label`, `error`).
- [x] 1.3 `frontend/src/components/Formulario/Formulario.jsx` + `index.js`: envoltorio `<form>`
      que compone `Input`(s)+`Boton` vía `children`, expone `onSubmit`.
- [x] 1.4 `frontend/src/components/Select/Select.jsx` + `index.js`: selector HTML genérico
      (`name`, `value`, `onChange`, `label`, `error`, `options`).

### Fase 2 — `LoginRegisterForm` (frontend)

- [x] 2.1 `frontend/src/components/LoginRegisterForm/LoginRegisterForm.jsx` + `index.js`: compone
      `Formulario`+`Input`+`Select`+`Boton`; estado local de modo (login/registro). Modo registro
      incluye edad, nivel de inglés (básico/intermedio/avanzado), idioma nativo (por defecto
      español) e idioma a aprender (por defecto inglés).
- [ ] 2.2 Validación de cliente: campos requeridos, formato de email, longitud mínima de
      contraseña, confirmación de contraseña, edad válida en modo registro (funciones puras
      testeables, ej. `loginRegisterForm.util.js` con `.test.js`). — **Pendiente:**
      `LoginRegisterForm.util.js` ya tiene las funciones puras (`isValidEmail`, `isValidPassword`,
      `isValidAge`, `validateRegisterForm`, `validateLoginForm`), pero falta su `.test.js`.
- [x] 2.3 Mensajes de error inline (sin `alert()`), en el idioma activo — verificado: `Input`
      muestra `error` inline y `LoginRegisterForm` traduce las claves `auth.errors.*` vía `t()`.

### Fase 3 — Integración 3D en la home

- [x] 3.1 Extender `frontend/src/components/VRViews/VRButton.jsx` para soportar `onClick`
      genérico además de `navigateTo` (sin romper el uso existente con `navigateTo`).
- [x] 3.2 Agregar estado `showAuth` en `AppContent` (`frontend/src/App.jsx`) y un nuevo `VRButton`
      que lo alterna.
- [x] 3.3 Embeber `LoginRegisterForm` dentro del `<Canvas>` vía `<Html>` de `@react-three/drei`,
      condicionado a `showAuth`.
- [x] 3.4 Verificar visualmente (dev server) que el formulario aparece/desaparece correctamente y
      no rompe los `VRButton` de navegación existentes. — Verificado en Chrome (chrome-devtools):
      se encontró y corrigió un crash (`useVRLanguage()` undefined dentro de `<Html>`, ver
      `problems_solutions.md`); tras el fix, el formulario abre/cierra correctamente y los botones
      VR-R3F, A-FRAME, AR-mirror y VR-AR STEREO siguen intactos.
- [x] 3.5 `frontend/src/components/UbicacionControl/` (átomo genérico, corner `top-left`/
      `top-right`): ícono que despliega zoom (−/+) y movimiento (↑↓←→) para ajustar en caliente
      posición/`distanceFactor` del `<Html>`. Valor por defecto definido con este control: zoom
      `2.70`, posición `[0, 1.6, 1]`.
- [x] 3.6 Botón ✕ para cerrar el formulario (esquina superior derecha del panel), además del
      botón "Login" que ya lo alternaba.
- [x] 3.7 Look control de la cámara en la vista inicial (`OrbitControls` en `App.jsx`): rotar con
      click+arrastre sin pan ni zoom (cámara no se desplaza ni se aleja/acerca); ángulo vertical
      acotado 60°–90° (no atraviesa el suelo, no llega a vista totalmente cenital) y horizontal
      acotado ±60° (no llega a ver de canto/atrás el formulario 3D embebido).
- [x] 3.8 Botón "Login" reposicionado arriba de VR-R3F/A-FRAME; color de hover de los `VRButton`
      cambiado de azul claro a gris oscuro (`config/theme.js`, `secondary.main`).

### Fase 4 — Sesión y API cliente (frontend)

- [ ] 4.1 Crear `AuthContext`/`useAuth()` con `login()`, `register()`, `logout()`, `user`, `token`,
      `isAuthenticated`.
- [ ] 4.2 Persistir el token en `localStorage` (clave `apprendevr_auth`) y rehidratar sesión al
      montar la app.
- [ ] 4.3 Cliente `fetch` para `POST /api/auth/login` y `POST /api/auth/register`.
- [ ] 4.4 Corregir `frontend/.env` (`VITE_API_URL`) para apuntar al backend, no al frontend.
- [ ] 4.5 Envolver `App.jsx` en el nuevo `AuthProvider`.

### Fase 5 — i18n

- [x] 5.1 Agregar claves `login.*`/`register.*` en `frontend/src/locales/es.json`. — Implementado
      bajo la clave `auth.*` (registerTitle, loginTitle, name, email, password, confirmPassword,
      placeholders, submitRegister/Login, switchToLogin/Register, errors.*).
- [x] 5.2 Replicar las mismas claves en `en.json` y `br.json` (sin huérfanas ni faltantes). —
      Verificado: mismas claves `auth.*` presentes en los tres locales.
- [x] 5.3 Consumir las claves en `LoginRegisterForm` vía `useVRLanguage()`/`t()`.

### Fase 6 — Backend: `AuthModule` (absorbe Fase 6 de 004)

- [ ] 6.1 Verificar/crear la entidad `User`→`usuarios` (reusar la de 004 si ya existe al momento
      de implementar).
- [ ] 6.2 `AuthModule` con `JwtModule.registerAsync` (secret/expiración desde `.env`).
- [ ] 6.3 `LoginDto`/`RegisterDto` con `class-validator`.
- [ ] 6.4 Lógica pura en `auth.util.ts` (normalización de email, validación de payload) + su
      `.spec.ts`.
- [ ] 6.5 `AuthService.login(email, password)` → `bcrypt.compare` contra `users.password`.
- [ ] 6.6 `AuthService.register(dto)` → valida email único, `bcrypt.hash(password, 10)`.
- [ ] 6.7 `JwtStrategy` (passport-jwt) + `JwtAuthGuard` + decorador `@CurrentUser()`.
- [ ] 6.8 `auth.controller.ts`: `POST /api/auth/login`, `POST /api/auth/register`.
- [ ] 6.9 `GET /api/users/me` protegido (usa `class-transformer` `@Exclude` para ocultar
      `password`).
- [ ] 6.10 Confirmar prefijo `/api` y CORS habilitado para el origin del frontend.
- [ ] 6.11 `auth.service.spec.ts` con el repo mockeado (casos normales y de borde).

### Fase 7 — Coordinación con requerimiento 004

- [x] 7.1 Editar `2-Developing/004-backend-nestjs-arquitectura-crud/requerimiento.md`: anotar que
      la Fase 6 (Auth) y la fila `src/auth/*` se ejecutan desde 007.
- [x] 7.2 Editar `2-Developing/004-backend-nestjs-arquitectura-crud/checklist.md`: anotar que la
      Fase 6 se ejecuta desde 007 (sin duplicar ni marcar sus ítems como completados desde ahí).

### Fase 8 — Verificación y cierre

- [ ] 8.1 `npm run build` (o `nest build`) compila sin errores en `ApprendeVr/backend/`.
- [ ] 8.2 `npm test` (Jest) del backend pasa sin levantar MySQL.
- [ ] 8.3 Con MySQL levantado (según 004): `curl POST /api/auth/register` → `curl POST
      /api/auth/login` → `curl GET /api/users/me` con el token, en secuencia, funcionan.
- [ ] 8.4 Frontend: `npm run build` compila sin errores.
- [ ] 8.5 Prueba manual end-to-end en el navegador: abrir la home, activar el formulario 3D,
      registrar un usuario nuevo, cerrar sesión (recargar), iniciar sesión con ese usuario.
- [ ] 8.6 Marcar los criterios de aceptación de `requerimiento.md` como cumplidos.
