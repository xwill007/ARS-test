# Checklist de ejecución (paso a paso)

### Fase 1 — Instalar y configurar el runner

- [ ] 1.1 Instalar `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` como
      devDependencies.
- [ ] 1.2 Configurar el bloque `test` (en `vite.config.js` o en un `vitest.config.js` separado, a
      decidir al implementar): `environment: 'jsdom'`, `globals` (definir si se importan
      `describe/it/expect` explícitamente o se usan como globales), setup file que registre los
      matchers de `@testing-library/jest-dom`.
- [ ] 1.3 Agregar scripts `test`, `test:watch`, `test:cov` en `package.json`.
- [ ] 1.4 Configurar `coverage.thresholds.global` en 80% y `coverage.exclude` con la lista
      concreta de componentes r3f/Three.js a excluir (confirmar rutas exactas al implementar:
      `VRViews/`, vistas bajo `views/` con `<Canvas>`, etc.).

### Fase 2 — Primer test real

- [ ] 2.1 Escribir `LoginRegisterForm.util.test.js` (casos normales y de borde de las cinco
      funciones puras — ver tabla en `tests.md`).
- [ ] 2.2 Correr `npm run test:cov` y confirmar que pasa y que la cobertura global (sobre archivos
      no excluidos) es ≥80%.

### Fase 3 — Documentar la convención

- [ ] 3.1 Actualizar `.claude/skills/componentes-frontend/SKILL.md` con la convención de test
      elegida (colocalizado, `.test.js`/`.test.jsx`, qué se testea vs. qué no).
- [ ] 3.2 Anotar en `007-formulario-3d-login-registro/checklist.md` (ítem 2.2) que el `.test.js`
      quedó resuelto desde este requerimiento 008.

### Fase 4 — Verificación y cierre

- [ ] 4.1 `npm run build` del frontend sigue compilando sin errores tras agregar las nuevas
      devDependencies.
- [ ] 4.2 Marcar los criterios de aceptación de `requerimiento.md` como cumplidos.
