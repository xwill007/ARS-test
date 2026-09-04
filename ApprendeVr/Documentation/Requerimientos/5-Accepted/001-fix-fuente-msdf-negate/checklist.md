# Checklist de ejecución

### Fase 1 — Preparación

- [x] 1.1 Confirmar con `npm run dev` (o el script equivalente del frontend) que se puede levantar
      la app y navegar tanto a `src/views/A-frame/index.html` como a `src/views/ARs/index.html`.
- [x] 1.2 Capturar screenshot "antes" de cada uno de los 3 contextos (standalone, domo VR, overlay
      de cono) para comparar contra el "después".

### Fase 2 — Fix en `src/views/A-frame/index.html`

- [x] 2.1 Agregar `negate="false"` al `<a-text>` de línea 71-79.
- [x] 2.2 Agregar `negate="false"` al `<a-text>` de línea 87-95.
- [x] 2.3 Verificar visualmente (recarga directa del archivo servido por Vite/dev server).

### Fase 3 — Fix en `VRDomo.jsx`

- [x] 3.1 Agregar `negate="false"` al `<a-text id="palabra-actual">` (línea 565-579).
- [x] 3.2 Verificar en la app principal: seleccionar una palabra en el domo y confirmar que el
      panel grande se ve limpio.
- [x] 3.3 Confirmar que el panel individual de palabra (línea 483-494) ahora usa Ultra-msdf con
      `negate="false"` y se ve limpio (evolucionó respecto al diagnóstico original, que lo asumía
      roboto).

### Fase 4 — Fix en `VRConeOverlay.jsx`

- [x] 4.1 Agregar `negate="false"` a la plantilla del `<a-text>` en `generateConeSpiralHTML`
      (línea ~179-188).
- [x] 4.2 Agregar `negate="false"` a la plantilla del `<a-text>` en la segunda función generadora
      (línea ~225-234).
- [x] 4.3 Verificar en `src/views/ARs/index.html` con el overlay de cono/espiral activo.

### Fase 5 — Validación cruzada y cierre

- [x] 5.1 Revisar que ningún otro `<a-text>` sin `Ultra-msdf` haya cambiado de apariencia
      (comparar contra screenshots "antes" de la Fase 1).
- [x] 5.2 `grep -rn "font-image.*Ultra-msdf" src/` y confirmar que cada resultado tiene
      `negate="false"` en el mismo bloque — asegura que no quedó ningún `<a-text>` con la fuente
      sin el atributo.
- [x] 5.3 Marcar los criterios de la sección 6 como cumplidos.
