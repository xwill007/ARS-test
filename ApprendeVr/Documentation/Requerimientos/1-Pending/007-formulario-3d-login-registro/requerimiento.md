# Requerimiento 007 — Formulario 3D de Login y Registro en la Home

## 1. Objetivo

Dar a `ApprendeVr` una pantalla de acceso (login/registro) integrada visualmente en la escena 3D
de la home, construida a partir de **componentes atómicos reutilizables** (`Boton`, `Input`,
`Formulario`) según la arquitectura por módulos/componentes del proyecto, y habilitar el flujo de
autenticación real (registro, login, sesión persistida) contra el backend NestJS.

## 2. Antecedentes y estado actual

### 2.1 Lo que ya existe

- La home actual es el componente raíz `frontend/src/App.jsx`: una escena React Three Fiber
  (`<Canvas>`, líneas 103–145) con `Sky`, `VRFloor` y varios `VRButton` (botones **mesh 3D**, no
  HTML) que navegan a otras vistas vía `window.location.href`. Encima del canvas se renderizan dos
  overlays **HTML planos** (`VRDisplay` y `VRConfig`, líneas 92 y 98) — no hay ningún login ni
  registro en esta pantalla hoy.
- `VRButton` (`frontend/src/components/VRViews/VRButton.jsx`) es un mesh `RoundedBox`+`Text` de
  drei que se activa por click de mouse o raycaster de mirada (`userData.interactive/onClick`,
  líneas 58–64) y hoy solo soporta navegación (`navigateTo`), no una acción arbitraria tipo
  `onClick`.
- El proyecto ya tiene instalado `@react-three/drei@^9.78.1`, que incluye el componente `<Html>`
  para embeber HTML real dentro de una escena `<Canvas>` — **no se usa actualmente en ningún
  archivo del proyecto**.
- No existen componentes atómicos compartidos `Boton`/`Button`, `Input` ni `Formulario`/`Form` en
  `frontend/src/components/`. Los únicos "botones" existentes son meshes 3D específicos de VR
  (`VRButton`) o botones HTML acoplados a una vista concreta (`ARSFloatingButton.jsx`,
  `ARStereoButton.jsx`).
- No existe ningún `AuthContext`, hook `useAuth`, ni llamada a `/auth/*` en todo `frontend/src`.
  Tampoco hay persistencia de sesión (token) en `localStorage` ni en ningún otro lado.
- i18n: `frontend/src/components/VRConfig/VRLanguageContext.jsx` expone `useVRLanguage()` →
  `{ currentLang, setCurrentLang, availableLanguages, t, isLoading }`, cargando
  `frontend/src/locales/{es,en,br}.json` vía `import.meta.glob`. No existen hoy claves
  `login`/`register`/`auth` en ninguno de esos tres archivos.
- `frontend/.env` ya define `VITE_API_URL`, pero apunta al **propio frontend**
  (`https://${FRONT_IP}:${FRONT_PORT}`), no al backend — hay que corregirlo/completarlo para que
  apunte al puerto del backend (`PORT=3001` según el `.env.example` planeado en el requerimiento
  004) más el prefijo `/api`.
- **Backend:** `ApprendeVr/backend/src/` hoy solo tiene el scaffold de Nest CLI de ejemplo
  (`app.controller.ts` con `GET /` → `getHello()`, `app.module.ts` con `imports: []`). No existe
  ningún módulo `auth`, `users`, entidad TypeORM, JWT, bcrypt ni conexión a base de datos.
- El requerimiento **004** (`2-Developing/004-backend-nestjs-arquitectura-crud`) ya diseñó — pero
  **aún no implementó** (su `checklist.md` no tiene ningún ítem marcado) — todo el scaffold base:
  Docker+MySQL (`english_vr`), conexión TypeORM, entidad `User`→tabla `usuarios`
  (`id,name,email,password,level,date`), módulos CRUD de `songs/words/phrases/evaluations`, y en su
  **Fase 6** un módulo `auth` completo: `AuthModule` con `JwtModule`, `AuthService.login` (bcrypt
  compare contra hashes `$2y$10$…` existentes), `AuthService.register` (bcrypt hash),
  `JwtStrategy`+`JwtAuthGuard`, y `GET /api/users/me` protegido.
- El requerimiento **005** (`1-Pending/005-roles-perfiles-planes-pago`) asume que ya existe un
  `auth.service.ts` con login funcional y una entidad `users` con `password` bcrypt (menciona
  `AuthService` devolviendo `effectivePermissions` en el payload de login/`me`, y un superadmin
  sembrado por seed que "puede hacer login en el primer arranque") — es decir, **005 construye
  autorización/roles encima de la autenticación básica que este requerimiento 007 entrega**, no al
  revés.

### 2.2 Decisión confirmada con el usuario

- El formulario debe vivir **embebido en la escena 3D** (dentro del `<Canvas>`, vía `<Html>` de
  drei), no como un overlay HTML plano estilo `VRDisplay`/`VRConfig`.
- Este requerimiento **absorbe explícitamente la Fase 6 (Auth JWT+bcrypt) del requerimiento 004**
  dentro de su propio alcance, en vez de depender de que 004 la complete primero — el formulario de
  login/registro no tiene sentido sin un backend de auth funcional, y se prefirió no bloquear este
  trabajo esperando otro requerimiento. El resto del alcance de 004 (scaffold, Docker, TypeORM,
  entidades, CRUD de `songs/words/phrases/evaluations`, streaming de video) **no cambia** y sigue
  siendo responsabilidad exclusiva de 004.
- Como consecuencia, se edita `2-Developing/004-backend-nestjs-arquitectura-crud/` (`requerimiento.md`
  y `checklist.md`) para dejar explícito que la Fase 6 y las filas/criterios relacionados con
  `src/auth/*` se ejecutan desde 007, evitando implementación duplicada.
- Este requerimiento entrega **autenticación** (identidad + sesión), no **autorización** (roles,
  perfiles, planes, permisos granulares) — eso sigue siendo alcance exclusivo de 005.

## 3. Historias de usuario

- Como visitante nuevo, quiero crear una cuenta con mi nombre, correo y contraseña desde la
  pantalla de inicio, para poder acceder a ApprendeVr con mi propio usuario.
- Como usuario registrado, quiero iniciar sesión con mi correo y contraseña desde la pantalla de
  inicio, para continuar usando la aplicación con mi progreso guardado.
- Como usuario, quiero ver un mensaje claro si mi correo o contraseña son incorrectos, o si el
  correo ya está registrado, para saber qué corregir sin adivinar.
- Como usuario, quiero que la pantalla de acceso se sienta parte de la experiencia 3D de la
  aplicación (con profundidad y ubicación en el espacio), en vez de un formulario plano
  superpuesto, para que la primera impresión sea coherente con el resto de la app.
- Como usuario, quiero ver el formulario de acceso en mi idioma (español, inglés o portugués),
  para entender cada campo, botón y mensaje de error.
- Como usuario, quiero que mi sesión se mantenga si recargo la página, para no tener que iniciar
  sesión cada vez que entro.

## 4. Alcance

### Incluido

**Frontend**

- Componentes atómicos **compartidos** en `frontend/src/components/` (Atomic Design, skill
  `componentes-frontend`): `Boton` (átomo, props `label`/`text`, `onClick`, `type`, `disabled`,
  `variant`), `Input` (átomo, props `type`, `name`, `value`, `onChange`, `placeholder`, `label`,
  `error`), `Formulario` (molécula que compone `Input`(s)+`Boton` vía `children`, props
  `onSubmit`).
- Componente `Select` (átomo, compartido en `frontend/src/components/`, mismo patrón que `Input`:
  props `name`, `value`, `onChange`, `label`, `error`, `options` `{value,label}[]`).
- Componente `LoginRegisterForm` (organismo, compartido en `frontend/src/components/`) que compone
  `Formulario`+`Input`+`Select`+`Boton`, con dos modos (login/registro) alternables, validación de
  cliente (campos requeridos, formato de email, longitud mínima de contraseña, confirmación de
  contraseña y edad válida en registro) y mensajes de error inline (sin `alert()`). El modo
  registro incluye, además de nombre/correo/contraseña: **edad** (`age`, numérico), **nivel de
  inglés** (`englishLevel`: `basico`/`intermedio`/`avanzado`, selector), **idioma nativo**
  (`nativeLanguage`, selector, por defecto `es`) e **idioma a aprender** (`targetLanguage`,
  selector, por defecto `en`) — estos tres últimos vía `Select`.
- Integración del formulario **dentro del `<Canvas>`** de `frontend/src/App.jsx` usando `<Html>`
  de `@react-three/drei`, mostrado/ocultado con un nuevo estado (`showAuth`) activado por un nuevo
  `VRButton` en la escena (requiere extender `VRButton` para soportar una prop `onClick` genérica
  además de `navigateTo`).
- `AuthContext`/`useAuth()` nuevo (`frontend/src/components/` o `frontend/src/context/`) que expone
  `login(email, password)`, `register(name, email, password)`, `logout()`, `user`, `token`,
  `isAuthenticated`; persiste el token en `localStorage` y lo rehidrata al montar la app.
  `VRLanguageProvider`/`VRThemeProvider` en `App.jsx` son el precedente directo de este patrón de
  provider.
- Cliente API mínimo (`fetch`) para `POST /api/auth/login` y `POST /api/auth/register`, usando una
  `VITE_API_URL` corregida para apuntar al backend (host+puerto del backend, no del frontend).
- Nuevas claves i18n `login.*`/`register.*` (labels, placeholders, botones, mensajes de error) en
  `frontend/src/locales/{es,en,br}.json`, consumidas vía `useVRLanguage()`/`t()` (skill
  `texto-multidioma`).

**Backend** (absorbe la Fase 6 de 004)

- `AuthModule` (`ApprendeVr/backend/src/auth/`) con `JwtModule.registerAsync` (secret/expiración
  vía `@nestjs/config`/`.env`).
- `AuthService.login(email, password)`: `bcrypt.compare` contra `users.password` (compatible con
  hashes existentes `$2y$10$…`), firma JWT, devuelve `{ access_token, user }` (usuario sin
  `password`).
- `AuthService.register(dto)`: valida email único, `bcrypt.hash(password, 10)`, crea el usuario
  (entidad `User`→tabla `usuarios`, reutilizando la de 004 si ya existe al momento de implementar;
  si no existe todavía, se crea aquí como prerequisito mínimo, sin duplicar el resto del alcance
  CRUD de 004).
- `LoginDto`/`RegisterDto` con `class-validator` (`@IsEmail`, `@MinLength`, etc.).
- Lógica pura testeable en `auth.util.ts` (ej. normalización de email, validación de payload) con
  su `.spec.ts` (skill `backend-nestjs`).
- `JwtStrategy` (passport-jwt) + `JwtAuthGuard` + decorador `@CurrentUser()`.
- `GET /api/users/me` protegido, devuelve el usuario sin `password` (`class-transformer`
  `@Exclude`).
- Prefijo `/api` y CORS habilitado para el origin del frontend (reutilizar si ya lo configuró 004
  Fase 3.4; configurarlo aquí si al momento de implementar todavía no existe).

**Coordinación con 004**

- Editar `Documentation/Requerimientos/2-Developing/004-backend-nestjs-arquitectura-crud/requerimiento.md`
  y `checklist.md` anotando que la Fase 6 (Auth) y las filas/criterios de `src/auth/*` se ejecutan
  desde este requerimiento 007.

### No incluido

- El resto del alcance de 004 no relacionado con auth (CRUD de `songs/words/phrases/evaluations`,
  streaming de video con `Range`, Docker/scaffold inicial más allá de lo estrictamente necesario
  para que `auth` compile) — sigue siendo responsabilidad exclusiva de 004.
- Roles, perfiles, planes de pago, permisos granulares, `PermissionsContext`, `<Can>`, o
  `effectivePermissions` en el payload de login/`me` — responsabilidad exclusiva del requerimiento
  005; este requerimiento entrega solo **autenticación** (identidad + sesión), no autorización.
- Recuperación de contraseña ("forgot password"), verificación de email, login social
  (Google/Facebook), autenticación de dos factores (2FA).
- Migración de columnas español→inglés de la tabla `usuarios` (diferida; decisión ya tomada en
  004).
- Rediseño de `VRButton`, `VRDisplay` o `VRConfig` existentes más allá de la extensión mínima de
  `VRButton` para soportar `onClick`.
- Adaptar el formulario al modo A-Frame/VR con casco (`views/A-frame`) — solo el modo R3F de
  escritorio/móvil en `App.jsx`.
- Integración con control por voz (requerimiento 006, que hoy menciona este mismo formulario como
  un foco futuro) — queda fuera; podrá integrarse después sobre los `Input`/`Boton` creados aquí.

## 5. Diseño técnico

### 5.1 Componentes frontend (Atomic Design + colocation)

| Carpeta | Tipo | Responsabilidad |
|---|---|---|
| `frontend/src/components/Boton/` | Átomo | Botón HTML genérico: `label`, `onClick`, `type`, `disabled`, `variant`. |
| `frontend/src/components/Input/` | Átomo | Input HTML genérico: `type`, `name`, `value`, `onChange`, `placeholder`, `label`, `error`. |
| `frontend/src/components/Select/` | Átomo | Selector HTML genérico: `name`, `value`, `onChange`, `label`, `error`, `options`. |
| `frontend/src/components/Formulario/` | Molécula | Envoltorio `<form>` que compone `Input`(s)+`Boton` vía `children`, maneja `onSubmit`. |
| `frontend/src/components/LoginRegisterForm/` | Organismo | Compone `Formulario`+`Input`+`Select`+`Boton`; estado local de modo (login/registro) + validación de cliente (incluye edad, nivel de inglés, idioma nativo, idioma a aprender en modo registro); llama a `useAuth()`. |

`LoginRegisterForm` se ubica en `components/` (compartido) y no en `views/`, porque es un
candidato natural a reutilizarse desde cualquier punto de entrada que requiera auth (hoy solo
`App.jsx`, potencialmente `views/mobile` o `views/A-frame` a futuro), siguiendo la regla de
decisión de la skill `componentes-frontend` ("genérico por diseño").

### 5.2 Integración 3D (drei `<Html>`)

Dentro del `<Canvas>` de `AppContent` (`frontend/src/App.jsx`), se agrega:

```jsx
{showAuth && (
  <Html transform occlude position={[0, 1.6, 1]} distanceFactor={2.7}>
    <LoginRegisterForm onSuccess={() => setShowAuth(false)} />
  </Html>
)}
```

Valores por defecto definidos tras probar visualmente con `UbicacionControl` (ver 5.1): posición
`[0, 1.6, 1]`, `distanceFactor` `2.70`. Quedan ajustables en caliente vía ese mismo control si
hiciera falta retocarlos más adelante.

controlado por un nuevo `VRButton` de la escena (ej. `text={t('buttons.login')}`) que alterna
`showAuth`, siguiendo el mismo patrón de estados ya usado para `showDomo`/`showBoth`/`showStereoAR`.

**Opciones consideradas:**

| Opción | Decisión | Motivo |
|---|---|---|
| Overlay HTML plano (patrón `VRDisplay`) con CSS 3D (`transform`/`perspective`) | Descartada | El usuario pidió que viva dentro de la escena 3D, no como panel plano superpuesto sobre el canvas. |
| **`<Html>` de drei dentro del `<Canvas>`** | **Elegida** | Permite inputs reales (no meshes) posicionados en el espacio 3D; es el patrón estándar de R3F para HTML embebido en escena; no requiere reinventar edición de texto. |
| Formulario íntegro con meshes 3D (texto interactivo sin HTML) | Descartada | R3F/drei no soportan campos de texto editables nativos en meshes; requeriría un teclado virtual 3D, fuera de alcance. |
| Formulario siempre visible como "gate" antes del resto de la escena | Descartada por ahora | Cambiaría el flujo actual de la home (VRButtons de navegación) de forma más disruptiva; se prefiere un toggle no bloqueante, revisable en una iteración futura. |

### 5.3 Backend — Auth (Fase 6 absorbida de 004)

Mismo esquema de capas que la skill `backend-nestjs`:

```
Controller (auth.controller.ts) → Service (auth.service.ts) → util.ts (funciones puras)
                                        │
                                        └──► Repository<User> (TypeORM) ──► MySQL (usuarios)
```

Reutiliza la entidad `User`→`usuarios` de 004 (Fase 4.1) si ya existe al momento de implementar;
si no existe todavía, se crea aquí como prerequisito mínimo (sin implementar el resto de módulos
CRUD de 004, que siguen siendo su responsabilidad).

**Pendiente de definir al implementar Fase 6:** el registro de frontend ya recolecta `age`,
`englishLevel`, `nativeLanguage` y `targetLanguage` (ver 5.1). La columna `level` de `usuarios`
(`id,name,email,password,level,date` según 004) cubre `englishLevel`; `age`, `nativeLanguage` y
`targetLanguage` no tienen columna equivalente hoy — hay que sumarlas al esquema (`RegisterDto` +
entidad `User`) al implementar esta fase, o decidir explícitamente descartarlas en el payload si no
se persisten.

### 5.4 Sesión en frontend

`AuthContext` guarda `token`/`user` en memoria + `localStorage` (clave `apprendevr_auth`),
rehidrata la sesión al montar (`useEffect` inicial), y agrega `Authorization: Bearer <token>` a las
llamadas autenticadas (ej. `GET /api/users/me`).

## 6. Archivos a modificar / crear

| Archivo | Acción |
|---|---|
| `frontend/src/components/Boton/Boton.jsx` + `index.js` | Crear átomo botón. |
| `frontend/src/components/Input/Input.jsx` + `index.js` | Crear átomo input. |
| `frontend/src/components/Select/Select.jsx` + `index.js` | Crear átomo selector. |
| `frontend/src/components/Formulario/Formulario.jsx` + `index.js` | Crear molécula formulario. |
| `frontend/src/components/LoginRegisterForm/LoginRegisterForm.jsx` + `index.js` | Crear organismo login/registro. |
| `frontend/src/components/AuthContext/AuthContext.jsx` (o `frontend/src/context/AuthContext.jsx`) | Crear provider/hook `useAuth()` + persistencia de sesión. |
| `frontend/src/App.jsx` | Envolver en `AuthProvider`; agregar `<Html>` con `LoginRegisterForm` dentro del `<Canvas>`; nuevo `VRButton` que alterna `showAuth`. |
| `frontend/src/components/VRViews/VRButton.jsx` | Extender para soportar `onClick` genérico además de `navigateTo`. |
| `frontend/src/locales/es.json`, `en.json`, `br.json` | Agregar claves `login.*`/`register.*`. |
| `frontend/.env` | Corregir/completar `VITE_API_URL` para apuntar al backend. |
| `ApprendeVr/backend/src/auth/auth.module.ts` | Crear módulo con `JwtModule.registerAsync`. |
| `ApprendeVr/backend/src/auth/auth.controller.ts` | `POST /api/auth/login`, `POST /api/auth/register`. |
| `ApprendeVr/backend/src/auth/auth.service.ts` | `login()`/`register()` con bcrypt+JWT. |
| `ApprendeVr/backend/src/auth/auth.util.ts` + `auth.util.spec.ts` | Funciones puras + tests. |
| `ApprendeVr/backend/src/auth/jwt.strategy.ts` | Validación de token (passport-jwt). |
| `ApprendeVr/backend/src/auth/dto/login.dto.ts`, `register.dto.ts` | DTOs con `class-validator`. |
| `ApprendeVr/backend/src/users/entities/user.entity.ts` | Entidad `User`→`usuarios` (reusar de 004 si ya existe). |
| `ApprendeVr/backend/src/users/users.controller.ts` | `GET /api/users/me` protegido. |
| `Documentation/Requerimientos/2-Developing/004-backend-nestjs-arquitectura-crud/requerimiento.md` | Anotar que Fase 6/`src/auth/*` se ejecuta desde 007. |
| `Documentation/Requerimientos/2-Developing/004-backend-nestjs-arquitectura-crud/checklist.md` | Anotar que Fase 6 se ejecuta desde 007. |

## 7. Criterios de aceptación

**Frontend**

- [ ] Existen y son reutilizables (con `index.js` barrel) los componentes `Boton`, `Input` y
      `Formulario` en `frontend/src/components/`.
- [ ] `LoginRegisterForm` compone esos tres componentes (no reimplementa inputs/botones propios).
- [ ] El formulario aparece embebido dentro de la escena 3D (`<Html>` dentro del `<Canvas>` de
      `App.jsx`), no como overlay HTML plano.
- [ ] Un nuevo `VRButton` en la escena alterna la visibilidad del formulario.
- [ ] El formulario valida en cliente: campos requeridos, formato de email, longitud mínima de
      contraseña, confirmación de contraseña en modo registro — sin llamar al backend si la
      validación falla.
- [ ] Un registro exitoso deja al usuario autenticado (token guardado) sin recargar la página.
- [ ] Un login exitoso guarda el token en `localStorage` y lo rehidrata tras recargar la página.
- [ ] Errores del backend (credenciales inválidas, email duplicado) se muestran en el propio
      formulario, en el idioma activo (`es`/`en`/`br`).
- [ ] Los tres locales (`es.json`, `en.json`, `br.json`) tienen las mismas claves nuevas de
      `login.*`/`register.*` (sin claves huérfanas en un idioma y faltantes en otro).

**Backend**

- [ ] `POST /api/auth/register` con un email nuevo crea el usuario (contraseña hasheada con
      bcrypt, nunca en texto plano) y devuelve `access_token`.
- [ ] `POST /api/auth/register` con un email ya existente responde error (no crea duplicado).
- [ ] `POST /api/auth/login` con credenciales válidas devuelve un `access_token` JWT y el usuario
      sin `password`.
- [ ] `POST /api/auth/login` con credenciales inválidas responde `401` sin filtrar si el email
      existe o no.
- [ ] `GET /api/users/me` con el token devuelve el usuario autenticado (sin `password`); sin token
      o con token inválido responde `401`.
- [ ] La lógica de negocio de `auth` está en funciones puras con `.spec.ts`, y `npm test` pasa sin
      necesidad de levantar MySQL.
- [ ] No hay secretos hardcodeados (`JWT_SECRET` sale de `.env`).

**Coordinación**

- [ ] `004-backend-nestjs-arquitectura-crud` (`requerimiento.md` y `checklist.md`) queda anotado
      indicando que su Fase 6/`src/auth/*` se ejecutó desde 007, sin duplicar trabajo.

## 8. Referencias

- Requerimiento 004: `Documentation/Requerimientos/2-Developing/004-backend-nestjs-arquitectura-crud/`
  (scaffold, entidad `User`, Fase 6 Auth absorbida aquí).
- Requerimiento 005: `Documentation/Requerimientos/1-Pending/005-roles-perfiles-planes-pago/`
  (autorización/roles/planes, construida encima de este requerimiento).
- Requerimiento 006: `Documentation/Requerimientos/1-Pending/006-control-por-voz-interacciones/`
  (menciona este formulario como integración futura de voz).
- Skill `componentes-frontend` (Atomic Design + colocation).
- Skill `backend-nestjs` (módulos por dominio, funciones puras testeables).
- Skill `texto-multidioma` (claves i18n en `es`/`en`/`br`).
- `frontend/src/App.jsx`, `frontend/src/components/VRViews/VRButton.jsx`,
  `frontend/src/components/VRDisplay.jsx`, `frontend/src/components/VRConfig/VRLanguageContext.jsx`.
- `@react-three/drei` — documentación del componente `<Html>`.
