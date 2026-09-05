# Requerimiento 008 — Estrategia de testing del frontend

## 1. Objetivo

Definir cómo se van a escribir y ejecutar los tests automatizados del frontend de `ApprendeVr`
(`ApprendeVr/frontend/`): qué runner/framework usar, qué se testea unitariamente y qué queda
fuera (verificación manual/visual), convención de nombres y ubicación, y cómo se mide y exige un
umbral de cobertura — análogo a lo que ya existe para el backend (skill `backend-nestjs`,
`coverageThreshold` del 80% en Jest, implementado en el requerimiento 007).

## 2. Antecedentes y estado actual

- El frontend (`ApprendeVr/frontend/`) no tiene ningún test runner configurado: `package.json` no
  declara script `test` ni dependencia de Jest/Vitest/Testing Library (confirmado).
- El backend ya adoptó un patrón de "funciones puras testeables" (skill `backend-nestjs`) con
  cobertura mínima del 80% aplicada vía `coverageThreshold` de Jest. El mismo principio se siguió
  al crear `LoginRegisterForm.util.js` (funciones puras: `isValidEmail`, `isValidPassword`,
  `isValidAge`, `validateRegisterForm`, `validateLoginForm`) — pero su test
  (`LoginRegisterForm.util.test.js`) quedó pendiente desde el requerimiento 007 precisamente
  porque no hay ningún runner instalado en el frontend (ver
  `007-formulario-3d-login-registro/checklist.md`, ítem 2.2).
- Ya existe un mecanismo de verificación automatizada distinto (no un test runner):
  `scripts/check-i18n.mjs` (`npm run check:i18n`), un script Node plano que valida la simetría de
  claves de traducción entre `es/en/br.json` y detecta strings hardcodeados. Queda fuera de esta
  definición, pero es precedente de que el proyecto ya acepta verificación automatizada más allá
  de tests unitarios clásicos.
- El frontend combina dos tipos de componentes muy distintos para efectos de testing:
  - **Componentes HTML puros** en `src/components/` (`Boton`, `Input`, `Select`, `Formulario`,
    `LoginRegisterForm`, `UbicacionControl` — ver skill `componentes-frontend`), que renderizan
    DOM normal y son testeables en `jsdom` sin problema.
  - **Componentes React Three Fiber/Three.js** (`VRButton`, vistas con `<Canvas>` como
    `VRDisplay`, las vistas 3D) que dependen de un `<canvas>`/WebGL real. Hasta ahora se verifican
    a mano en el navegador (Chrome DevTools MCP: capturas, clicks simulados, lectura de consola),
    no con tests automatizados. Esta distinción es central para el alcance de este requerimiento.
- Stack actual: React 18.2.0, Vite 4.4.0, `@vitejs/plugin-react` 4.0.1 (ver
  `frontend/package.json`).

## 3. Historias de usuario

- Como desarrollador del frontend, quiero un comando único (`npm test`) que corra los tests
  unitarios del frontend, para verificar mi trabajo igual que ya puedo hacerlo en el backend.
- Como desarrollador, quiero saber sin ambigüedad qué tipo de componente se testea unitariamente y
  cuál se verifica a mano en el navegador, para no perder tiempo intentando testear algo que no se
  puede automatizar de forma realista (ni saltarme un test que sí correspondía).
- Como equipo, quiero un umbral de cobertura mínimo exigido automáticamente al correr los tests,
  para no regresar silenciosamente por debajo del nivel de calidad ya adoptado en el backend.

## 4. Alcance

### Incluido

- Elegir y documentar el test runner/framework para el frontend (ver Diseño técnico).
- Definir la convención de nombres/ubicación de los tests (colocalizados junto al archivo que
  testean, sufijo `.test.js`/`.test.jsx`).
- Definir qué se testea unitariamente: funciones puras (`*.util.js`) y componentes HTML puros de
  `src/components/` que no dependen de `<Canvas>`/r3f.
- Definir qué queda explícitamente fuera del testing unitario (componentes r3f/Three.js, vistas 3D
  completas) y su mecanismo de verificación alternativo (manual en navegador, ya practicado con
  Chrome DevTools MCP durante el requerimiento 007).
- Definir un umbral de cobertura (target: 80%, igual que el backend) y cómo se aplica (config del
  runner elegido).
- Instalar y configurar el runner elegido (scaffold mínimo: dependencias, script `npm test`/
  `npm run test:cov`, archivo de config) — no escribir todavía tests de cada componente existente.
- Escribir, como primer caso real, el test pendiente de `LoginRegisterForm.util.js` (cierra el gap
  ya señalado en el requerimiento 007), para demostrar que el runner elegido funciona end-to-end.

### No incluido

- Tests unitarios de todos los componentes existentes de una sola vez — se agregan
  progresivamente, componente por componente, en trabajo futuro; este requerimiento solo deja el
  runner funcionando más el primer caso real.
- Tests e2e/integración con navegador real (Playwright/Cypress) — la verificación manual visual
  sigue siendo el mecanismo para flujos 3D/end-to-end por ahora.
- Testear componentes React Three Fiber/Three.js (`VRButton`, vistas con `<Canvas>`) de forma
  unitaria — `jsdom` no soporta WebGL/canvas de forma realista; se documenta como limitación
  explícita, no como tarea pendiente a resolver después.
- Migrar o reemplazar `scripts/check-i18n.mjs` — sigue siendo un mecanismo aparte, ya funcional.

## 5. Diseño técnico

### Opciones consideradas

| Opción | Decisión | Motivo |
|---|---|---|
| **Vitest + `@testing-library/react` + jsdom** | Elegida | Vite ya es el bundler del proyecto: Vitest comparte su configuración y no necesita transformadores extra (Babel/`ts-jest`) para JSX/ESM. Es más rápido que Jest en un proyecto Vite. Su API es compatible con Jest (`describe`/`it`/`expect`), así que el patrón `*.util.js` + `*.test.js` ya usado se traslada casi 1:1 desde el backend (`*.spec.ts`). |
| Jest + Babel | Descartada | Requeriría configurar Babel/transformadores manualmente para JSX/ESM en un proyecto que ya usa Vite nativamente — trabajo redundante que Vitest evita. |
| Sin test runner (solo scripts custom tipo `check-i18n.mjs`) | Descartada | Válido para chequeos estructurales puntuales, pero no escala a testear lógica de validación ni componentes con aserciones expresivas, ni reporta cobertura. |

### Convenciones

- Nombre de archivo: `<nombre>.test.js` (o `.test.jsx` si el archivo testea un componente que
  retorna JSX), colocalizado junto al archivo que testea — mismo patrón anticipado para
  `LoginRegisterForm.util.js` desde el requerimiento 007.
- Componentes HTML puros (`Boton`, `Input`, `Select`, `Formulario`): test de render + interacción
  con `@testing-library/react` (`render`, `screen`, `fireEvent`/`userEvent`), sin mockear nada
  externo (son puros por diseño, sin dependencias de contexto).
- Componentes con contexto (`LoginRegisterForm`, que usa `useVRLanguage()`): envolver en el
  provider real (`VRLanguageProvider`) dentro del test, no mockear el hook — mismo principio de
  "no mockear lo que se puede probar de verdad" ya aplicado en el backend.
- Funciones puras (`*.util.js`): test directo sin render, cubriendo casos normales y de borde
  (igual criterio que `backend-nestjs`).
- Cobertura: proveedor `v8` (integrado en Vitest), umbral global 80% (`test.coverage.thresholds`),
  excluyendo explícitamente del cálculo los componentes r3f/Three.js listados en el Alcance —
  mismo criterio que el backend excluye `*.module.ts`/`main.ts`: wiring o render 3D sin lógica
  unit-testeable de forma realista, nunca una omisión silenciosa.

### Scripts nuevos en `package.json` (referencia, se ajustan al implementar)

```json
"test": "vitest run",
"test:watch": "vitest",
"test:cov": "vitest run --coverage"
```

## 6. Archivos a modificar

| Archivo | Acción |
|---|---|
| `ApprendeVr/frontend/package.json` | Agregar `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` como devDependencies; agregar scripts `test`/`test:watch`/`test:cov`. |
| `ApprendeVr/frontend/vite.config.js` (o `vitest.config.js` nuevo, a decidir al implementar) | Config de test: `environment: 'jsdom'`, `coverage.thresholds` (80%), `coverage.exclude` (componentes r3f/Three.js). |
| `ApprendeVr/frontend/src/components/LoginRegisterForm/LoginRegisterForm.util.test.js` | Primer test real (cierra el gap del checklist 007, ítem 2.2). |
| `.claude/skills/componentes-frontend/SKILL.md` | Documentar la convención de test (colocalizado, `.test.js`) al describir cómo crear un componente nuevo. |
| `Documentation/Requerimientos/1-Pending/007-formulario-3d-login-registro/checklist.md` | Anotar en el ítem 2.2 que el `.test.js` se resolvió desde este requerimiento 008. |

## 7. Criterios de aceptación

- [ ] `npm test` (o `npm run test:cov`) corre desde `ApprendeVr/frontend/` sin configuración manual
      adicional.
- [ ] `LoginRegisterForm.util.test.js` existe, cubre casos normales y de borde de las cinco
      funciones puras (`isValidEmail`, `isValidPassword`, `isValidAge`, `validateRegisterForm`,
      `validateLoginForm`), y pasa.
- [ ] La cobertura reportada por `npm run test:cov` sobre los archivos no excluidos alcanza ≥80%
      (statements/branches/functions/lines).
- [ ] Los componentes r3f/Three.js excluidos de cobertura están declarados explícitamente en la
      config del runner (no es una omisión silenciosa).
- [ ] `.claude/skills/componentes-frontend/SKILL.md` (u otro skill relevante) documenta la
      convención elegida para que futuros componentes la sigan sin releer este requerimiento.
- [ ] `npm run build` del frontend sigue compilando sin errores tras agregar las nuevas
      devDependencies.

## 8. Referencias

- Skill `backend-nestjs` (precedente de "funciones simples testeables" + cobertura 80%,
  implementado en el backend durante el requerimiento 007).
- Skill `componentes-frontend` (Atomic Design + colocation; define qué componentes son "HTML
  puro" vs. r3f/Three.js).
- `ApprendeVr/frontend/scripts/check-i18n.mjs` (precedente de verificación automatizada existente,
  mecanismo aparte que este requerimiento no toca).
- `Documentation/Requerimientos/1-Pending/007-formulario-3d-login-registro/checklist.md` (ítem
  2.2, origen del gap concreto que este requerimiento cierra).
