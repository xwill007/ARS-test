# Problemas y soluciones

Registro de incidentes encontrados durante la implementación de este requerimiento, con fecha,
causa y solución. Se actualiza a medida que surgen (no se completa por adelantado).

## Registro

### 2026-09-05 — `useVRLanguage()` undefined dentro de `<Html>` (drei)

**Causa:** `@react-three/drei` v9.78.1 monta el contenido de `<Html>` en una raíz de React
separada (`ReactDOM.createRoot(el)` + `.render()`), no mediante un portal. Por eso no hereda los
providers de contexto (`VRLanguageProvider`, `VRThemeProvider`, etc.) del árbol principal de
`App.jsx`. Al activar el formulario (botón "Login"), `LoginRegisterForm` crasheaba con
`Cannot destructure property 't' of 'useVRLanguage(...)' as it is undefined`.

**Solución:** envolver el contenido embebido en `<Html>` con su propio `VRLanguageProvider`,
sincronizado con el idioma activo vía `key={currentLang} defaultLang={currentLang}` (ver
`App.jsx`, sección `showAuth`). Esto preserva el diseño del checklist (Fase 5.3: consumir vía
`useVRLanguage()/t()`) sin reestructurar `LoginRegisterForm`. Limitación conocida: si el usuario
cambia el idioma global mientras el formulario está abierto, la raíz aislada se remonta (por el
`key`) y pierde los valores no guardados del formulario; aceptable dado el alcance actual.

Si en el futuro se necesita `VRThemeContext` (u otro contexto) dentro de contenido embebido en
`<Html>`, aplicar el mismo patrón: volver a proveer el contexto localmente en ese punto, no asumir
que se hereda del árbol externo.

### 2026-09-05 — Puerto 3306 ocupado por un MySQL nativo del host

**Causa:** al levantar `docker compose up -d` en `ApprendeVr/backend/` (Fase 6/8), el contenedor
`db` quedaba en estado `Created` sin arrancar nunca (sin logs, sin error visible en la salida de
`docker compose`). La causa real: ya había un `mysqld` nativo del sistema escuchando en
`127.0.0.1:3306` (ajeno a este proyecto), así que Docker no podía bindear ese puerto en el host.

**Solución:** cambiar el puerto expuesto por el contenedor a `3307` (`DB_PORT=3307` en `.env` y
`.env.example`; `docker-compose.yml` ya lo tomaba de `${DB_PORT:-3306}`, sin cambios ahí). MySQL
sigue escuchando en el puerto `3306` **dentro** del contenedor; solo cambia el mapeo al host. Si
en otra máquina el 3306 está libre, `DB_PORT` puede volver a 3306 sin tocar código.

**Nota adicional:** a pedido del usuario, el contenedor se nombra explícitamente
`Backend-ApprendeVr` (`container_name` en `docker-compose.yml`) en vez del nombre autogenerado
`backend-db-1`.

### 2026-09-05 — Campos nuevos del registro (edad, nivel, idiomas) sin persistir en el backend

**Estado:** el formulario de registro (`LoginRegisterForm`) ya recolecta `age`, `nativeLanguage` y
`targetLanguage` además de `name`/`email`/`password`/`englishLevel` (ver Fase 2 de este mismo
checklist), pero el `RegisterDto`/entidad `User` del backend implementado en la Fase 6 solo cubre
`name`, `email`, `password` y `level` (columnas reales de `usuarios`). `age`, `nativeLanguage` y
`targetLanguage` **no tienen columna equivalente hoy**: con `ValidationPipe({ whitelist: true })`
esas propiedades se descartan silenciosamente si el frontend llega a enviarlas (Fase 4), no se
persisten ni dan error. Pendiente decidir (al implementar la Fase 4): sumarlas al esquema
(`ALTER TABLE usuarios ADD COLUMN ...` + entidad + DTO) o descartarlas explícitamente del payload
del cliente.

### 2026-09-05 — Mixed content: frontend HTTPS llamando a un backend HTTP

**Causa:** el frontend corre en HTTPS (certificado autofirmado, `vite.config.js`), pero el
backend NestJS no tiene TLS configurado (HTTP plano, puerto 3001). Un `fetch()` directo desde el
frontend a `http://.../api/...` lo bloquea el navegador (mixed content: contenido activo inseguro
desde una página segura), incluso con CORS habilitado.

**Solución:** agregar un proxy en `vite.config.js` (`server.proxy['/api'] → http://localhost:3001`,
`changeOrigin: true`). El frontend llama a rutas relativas (`/api/auth/login`, etc.), mismo origen
HTTPS desde la perspectiva del navegador; Vite reenvía la petición por HTTP internamente hacia
Nest. Evita también depender de `VITE_API_URL`/CORS para este caso (ver ítem 4.4 del checklist).
Si en el futuro el backend corre detrás de HTTPS real, se puede volver a una URL absoluta sin
tocar el frontend más que esa variable.

### 2026-09-05 — Decisión de UX: registro no autentica automáticamente

**Contexto:** el criterio de aceptación original decía "un registro exitoso deja al usuario
autenticado". El usuario pidió en cambio que, tras registrarse, el formulario pase a modo login
con el correo ya cargado, dejando solo el campo de contraseña por completar — no autenticar de
una vez.

**Implementación:** `submitRegister` (`App.jsx`) solo llama a `POST /api/auth/register`, sin
guardar token ni cerrar el formulario. `LoginRegisterForm.handleSubmit` cambia `mode` a `'login'`
y precarga `values.email` tras un registro exitoso. El login inmediato posterior (acción explícita
del usuario) es el que guarda `apprendevr_auth` en `localStorage` y redirige a
`src/views/A-frame/index.html`. El criterio de aceptación de `requerimiento.md` se actualizó para
reflejar este flujo real.

### 2026-09-05 — Cobertura de tests del backend por debajo del umbral (hallazgo tardío)

**Hallazgo tardío:** el checklist ya marcaba como `[x]` el ítem 6.11 (`auth.service.spec.ts` con
dependencias mockeadas) dando a entender que el testing del módulo `auth` estaba resuelto, pero al
pedir explícitamente verificar cobertura ≥80% se detectó que la cobertura real del proyecto era
solo ~37% — la mayoría de los archivos (`*.module.ts`, `main.ts`, DTOs, guards, decorators,
`jwt.strategy.ts`, controllers, `users.service.ts`, `configuration.ts`) no tenían ningún test
propio; `auth.service.spec.ts` solo cubría `auth.service.ts` porque mockeaba `UsersService`
completo, sin ejercitar su implementación real.

**Solución:** se agregaron specs para `users.service.ts`, `jwt.strategy.ts`, `configuration.ts`,
`auth.controller.ts`, `users.controller.ts` y los DTOs (`login.dto.spec.ts`/`register.dto.spec.ts`
vía `class-validator`). Se configuró `coverageThreshold.global` en 80% en `package.json` (Jest
falla si se regresa por debajo) y se excluyó explícitamente de `collectCoverageFrom` lo que es
wiring puro sin lógica propia (`*.module.ts`, `main.ts`, `*.guard.ts`, `*.decorator.ts`), documentado
en el skill `backend-nestjs`. Resultado: 100% de cobertura (statements/branches/functions/lines),
34 tests en verde.

### 2026-09-05 — El editor reintroduce `node:test`/`@jest/globals` en archivos `.spec.ts` nuevos

**Problema:** al menos dos veces (`configuration.spec.ts`, `users.service.spec.ts`), el archivo
recién creado apareció modificado en disco con contenido que nunca se escribió desde acá:
`import { beforeEach, describe, it } from 'node:test';`, `import { expect, jest } from
'@jest/globals';`, tipos `jest.fn<any>()` agregados, e incluso (en `configuration.spec.ts`) dos
funciones stub `function afterAll() {...}`/`function expect() { throw new Error('Function not
implemented.') }` que tapaban los globals reales de Jest dentro de ese archivo — causando errores
de tipo reales (`Property 'toEqual' does not exist on type 'void'`), no solo ruido de editor.

**Causa:** el proyecto usa los globals ambient de Jest (vía `@types/jest`, sin imports explícitos
de `describe`/`it`/`expect`/`jest`, como ya hacían el resto de los `*.spec.ts` existentes). Algo en
el entorno del usuario (auto-fix/auto-import al abrir un archivo `.ts` nuevo con nombres aún no
resueltos por el TS server, posible extensión o asistente del editor) resuelve esos nombres contra
`node:test`/`@jest/globals` en vez de reconocer los globals de `@types/jest`, y reescribe el
archivo. Pendiente de confirmar con el usuario qué extensión/auto-fix concreto lo causa.

**Solución aplicada (reactiva):** se reescribió cada archivo afectado quitando esos imports/tipos
y las funciones stub, verificando `tsc --noEmit` + `eslint` + `npm test` limpios después de cada
fix. **No hay solución preventiva todavía** — si vuelve a pasar en un archivo nuevo, aplicar el
mismo fix (quitar los imports de `node:test`/`@jest/globals`, dejar `jest.fn()` sin `<any>`) y
verificar con los tres comandos de arriba.
