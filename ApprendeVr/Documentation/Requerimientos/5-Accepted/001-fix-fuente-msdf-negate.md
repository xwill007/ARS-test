# Requerimiento 001 — Corregir Fondo Negativo en Texto MSDF (Ultra-msdf)

## 1. Objetivo

Eliminar el recuadro blanco sólido que aparece detrás de cada letra en los textos 3D que usan la
fuente personalizada `Ultra-msdf` (componente `text` de A-Frame con `shader: msdf`), tanto en el
prototipo standalone `src/views/A-frame/index.html` como en los componentes A-Frame embebidos
dentro del stack React de `src/views/ARs/`.

Este es el mismo bug ya identificado y resuelto en el proyecto hermano `xwill007/A-frame`
(clonado localmente en `/Users/home/ARS-test/A-frame`, commit `a0cccee092d75241170035b1286c947f25354f9d`,
"Fix MSDF font rendering issue by setting negate property to false for A-Frame text components").
Aquí se reproduce en `ApprendeVr/frontend` porque comparte los mismos assets de fuente
(`public/fonts/Ultra-msdf/Ultra-msdf.json` + `.png`, generados con `msdf-bmfont-xml`), pero la
solución no puede copiarse literal porque la arquitectura de `ApprendeVr/frontend` no tiene una
única instancia de A-Frame (ver sección 2.2).

## 2. Antecedentes y estado actual

### 2.1 Causa raíz (heredada del Requerimiento 003 de `A-frame`)

El componente `text` de A-Frame expone la propiedad `negate` (booleano, `true` por defecto), que
invierte el signo con el que se interpreta el campo de distancia (SDF) de la textura de fuente.
Ese default `true` está calibrado para la fuente "roboto" que trae A-Frame de fábrica. La fuente
`Ultra-msdf` usada en este proyecto fue generada con `msdf-bmfont-xml`, cuya convención de signo es
la opuesta: con `negate` en su valor por defecto (`true`), cada glifo se renderiza dentro de un
recuadro blanco sólido en vez de mostrarse limpio. El arreglo es forzar `negate: false` en los
`<a-text>` que usan esta fuente.

### 2.2 Por qué la solución del proyecto `A-frame` (parche global) no aplica igual aquí

En `A-frame/english-vr/VR/src/fonts.js` la solución fue un parche **global y único**:
`AFRAME.components.text.schema.negate.default = false;`, porque esa app es una sola página HTML
con una sola instancia de A-Frame, y **todo** su texto 3D usa la misma fuente `Arial-msdf`.

`ApprendeVr/frontend` no cumple ninguna de esas dos condiciones:

- **Múltiples instancias de A-Frame independientes.** `src/views/A-frame/index.html` carga
  `/libs/aframe.min.js` como página standalone; el `index.html` raíz (app principal, `App.jsx`)
  carga el mismo archivo pero en un documento distinto; y `VRConeOverlay.jsx` monta su propia
  instancia de A-Frame 1.4.2 vía CDN dentro de un `<iframe srcDoc>` aislado. Un parche de default
  de schema hecho en un solo lugar no se propaga a los otros — habría que duplicarlo en al menos 3
  puntos de inicialización distintos.
- **Fuentes mixtas en la misma instancia.** A diferencia del proyecto `A-frame`, aquí conviven
  `<a-text>` con `font="Ultra-msdf"` junto a otros `<a-text>` que usan la fuente roboto por defecto
  (sin `font` explícito) — por ejemplo en `VRLocalVideoOverlay.jsx`, `VRVoiceController.jsx` y el
  propio `VRDomo.jsx` (ver 2.3). Cambiar el default global de `negate` a `false` en cualquiera de
  esas instancias rompería visualmente los textos que sí dependen del default `true` calibrado
  para roboto.

Por eso la solución recomendada aquí es **por elemento** (`negate="false"` explícito solo en los
`<a-text>` que usan `Ultra-msdf`), no un parche de default global. Ver sección 4.

### 2.3 Instancias afectadas hoy (confirmado con `grep -rl "msdf" src/`)

Solo 3 archivos usan la fuente `Ultra-msdf` actualmente; **no todos los `<a-text>` de esos archivos
están afectados** — solo los que efectivamente pasan `font`/`font-image` a `Ultra-msdf`:

- **`src/views/A-frame/index.html`** (líneas 71-79 y 87-95): dos `<a-text>`, ambos con
  `font="/fonts/Ultra-msdf/Ultra-msdf.json"` — **ambos afectados**.
- **`src/components/VRViews/VRDomo.jsx`**:
  - Línea 483-494 (panel individual de palabra, `class="texto-panel"`): tiene `shader="msdf"` pero
    sus líneas de `font`/`font-image` están deshabilitadas mediante el prefijo `//` (líneas 490-491,
    un truco para "comentar" atributos dentro de JSX, donde React los trata como el nombre de
    atributo literal `//font` en vez de deshabilitar la línea de verdad) — usa la fuente roboto por
    defecto, **no afectado**.
  - Línea 565-579 (panel grande `id="palabra-actual"`): `font="/fonts/Ultra-msdf/Ultra-msdf.json"`
    activo — **afectado**.
- **`src/views/ARs/ARScomponents/a-frame-components-ars/VRConeOverlay.jsx`**: la función
  `VRConeOverlay` (línea 269) inicializa `useState(ULTRA_MSDF)` (línea 107-110) y lo pasa a las dos
  funciones generadoras de HTML de panel (`generateConeSpiralHTML`, usada en las plantillas de
  `<a-text>` de las líneas 179-188 y 225-234) — **ambos afectados**. Este archivo renderiza su
  `<a-scene>` dentro de un `<iframe srcDoc>` con su propia carga de A-Frame por CDN (línea 349),
  aislada de las otras dos instancias.

### 2.4 Por qué el usuario los detectó entrando por `ARs/index.html` y `A-frame/index.html`

`src/views/A-frame/index.html` es standalone y contiene el bug directamente. `src/views/ARs/index.html`
en cambio es solo el punto de montaje de `appArs.jsx` (ver `src/views/ARs/index.jsx`); no contiene
`<a-text>` propio — el bug se ve ahí porque ese árbol de componentes monta `VRConeOverlay.jsx` (uno
de los overlays disponibles vía `AROverlayController`, ver `appArs.jsx`) y/o `VRDomo.jsx` (usado por
`StereoARPanel.jsx` / `ARPanel.jsx` en ese mismo stack), que son los archivos con el problema real.

### 2.5 Archivos y datos relevantes

| Recurso | Ruta | Rol |
|---|---|---|
| Assets de la fuente | `public/fonts/Ultra-msdf/Ultra-msdf.json` + `.png` | Misma fuente generada con `msdf-bmfont-xml` que en el proyecto `A-frame` |
| Prototipo standalone | `src/views/A-frame/index.html` | 2 `<a-text>` afectados |
| Panel de palabra del domo VR | `src/components/VRViews/VRDomo.jsx` | 1 de 2 `<a-text>` afectado (línea 565) |
| Overlay de cono en espiral (AR) | `src/views/ARs/ARScomponents/a-frame-components-ars/VRConeOverlay.jsx` | 2 `<a-text>` afectados, dentro de `iframe srcDoc` con A-Frame propio |
| Precedente ya resuelto | `A-frame/english-vr/VR/src/fonts.js` y `A-frame/english-vr/VR/Requerimientos/003-agregar-nuevas-canciones` (sección "Ajuste posterior") | Diagnóstico original de la causa raíz (`negate`) |

## 3. Alcance

### Incluido

- Corregir los 5 `<a-text>` identificados en 2.3 agregando `negate="false"` explícito.
- Verificar visualmente en los tres contextos (standalone `A-frame/index.html`, app principal con
  `VRDomo.jsx`, overlay AR con `VRConeOverlay.jsx`) que el texto se ve limpio, sin el recuadro
  blanco.
- Confirmar que los `<a-text>` con fuente roboto por defecto (no tocados) siguen viéndose igual
  que antes del cambio (no regresión).

### No incluido

- Reactivar el `font`/`font-image` comentado en `VRDomo.jsx` líneas 490-491 (panel individual de
  palabra) — sigue usando roboto por decisión de diseño existente, ajena a este requerimiento. Si
  en el futuro se reactiva, deberá agregarse `negate="false"` en ese mismo cambio.
- Unificar las 3 instancias de A-Frame en una sola, o introducir un mecanismo de inicialización
  compartido entre ellas — se documenta como posible mejora futura, no se resuelve aquí.
- Cambios en `A-frame/` (proyecto hermano) — ese repo ya tiene su propio fix aplicado.

## 4. Diseño técnico

### Opción A — `negate="false"` por elemento (recomendada)

Agregar el atributo directamente en cada `<a-text>` afectado, junto a `shader="msdf"`:

```html
<a-text
  font="/fonts/Ultra-msdf/Ultra-msdf.json"
  font-image="/fonts/Ultra-msdf/Ultra-msdf.png"
  shader="msdf"
  negate="false"
  ...>
</a-text>
```

- **Pros:** cambio mínimo y localizado (una línea por elemento); no requiere tocar la
  inicialización de ninguna de las 3 instancias de A-Frame; cero riesgo para los `<a-text>` con
  fuente roboto por defecto en los mismos archivos o instancias.
- **Contras:** si se agregan nuevos `<a-text>` con `Ultra-msdf` en el futuro, hay que recordar
  incluir `negate="false>` a mano (mitigado con el checklist de aceptación, sección 6).

### Opción B — parche de default por instancia de A-Frame (descartada como solución única)

Replicar el patrón de `A-frame/english-vr/VR/src/fonts.js`
(`AFRAME.components.text.schema.negate.default = false`) en cada uno de los 3 puntos de carga de
A-Frame. Descartada como única solución porque, según 2.3, `VRDomo.jsx` y potencialmente otros
archivos que comparten la instancia principal de A-Frame (app raíz) tienen `<a-text>` con fuente
roboto por defecto que dependen de `negate: true` — un parche de default ahí los rompería. Podría
convivir con la Opción A si en el futuro **todos** los `<a-text>` de una instancia usaran
`Ultra-msdf`, pero hoy no es el caso en ninguna de las 3.

**Decisión:** aplicar Opción A en los 5 elementos identificados.

## 5. Archivos a modificar

| Archivo | Elemento(s) | Cambio |
|---|---|---|
| `src/views/A-frame/index.html` | `<a-text>` línea 71-79 (dentro de `#video-container`) | Agregar `negate="false"` |
| `src/views/A-frame/index.html` | `<a-text>` línea 87-95 (texto suelto en `<a-scene>`) | Agregar `negate="false"` |
| `src/components/VRViews/VRDomo.jsx` | `<a-text id="palabra-actual">` línea 565-579 | Agregar `negate="false"` |
| `src/views/ARs/ARScomponents/a-frame-components-ars/VRConeOverlay.jsx` | `<a-text>` en `generateConeSpiralHTML` (plantilla de línea 179-188) | Agregar `negate="false"` a la plantilla del `<a-text>` |
| `src/views/ARs/ARScomponents/a-frame-components-ars/VRConeOverlay.jsx` | `<a-text>` en la segunda función generadora (plantilla de línea 225-234) | Agregar `negate="false"` a la plantilla del `<a-text>` |

## 6. Criterios de aceptación

- [ ] Los 5 `<a-text>` listados en la sección 5 tienen `negate="false"` explícito.
- [ ] Al abrir `src/views/A-frame/index.html` directamente, ambos textos ("á é í ó ú ñ" y
      "msdf-ultra á,é,í,ó,ú,ñ") se ven sin recuadro blanco.
- [ ] En la app principal (`App.jsx`), el panel `id="palabra-actual"` del domo VR muestra la
      palabra seleccionada sin recuadro blanco.
- [ ] En `src/views/ARs/index.html`, con el overlay `vrConeOverlay` activo, los paneles en espiral
      muestran las palabras sin recuadro blanco.
- [ ] Los `<a-text>` con fuente roboto por defecto (p. ej. `VRLocalVideoOverlay.jsx`,
      `VRVoiceController.jsx`, panel individual de palabra en `VRDomo.jsx`) no cambian visualmente
      respecto a antes del fix (no regresión).

## 7. Checklist de ejecución

### Fase 1 — Preparación

- [ ] 1.1 Confirmar con `npm run dev` (o el script equivalente del frontend) que se puede levantar
      la app y navegar tanto a `src/views/A-frame/index.html` como a `src/views/ARs/index.html`.
- [ ] 1.2 Capturar screenshot "antes" de cada uno de los 3 contextos (standalone, domo VR, overlay
      de cono) para comparar contra el "después".

### Fase 2 — Fix en `src/views/A-frame/index.html`

- [ ] 2.1 Agregar `negate="false"` al `<a-text>` de línea 71-79.
- [ ] 2.2 Agregar `negate="false"` al `<a-text>` de línea 87-95.
- [ ] 2.3 Verificar visualmente (recarga directa del archivo servido por Vite/dev server).

### Fase 3 — Fix en `VRDomo.jsx`

- [ ] 3.1 Agregar `negate="false"` al `<a-text id="palabra-actual">` (línea 565-579).
- [ ] 3.2 Verificar en la app principal: seleccionar una palabra en el domo y confirmar que el
      panel grande se ve limpio.
- [ ] 3.3 Confirmar que el panel individual de palabra (línea 483-494, fuente roboto) no cambió.

### Fase 4 — Fix en `VRConeOverlay.jsx`

- [ ] 4.1 Agregar `negate="false"` a la plantilla del `<a-text>` en `generateConeSpiralHTML`
      (línea ~179-188).
- [ ] 4.2 Agregar `negate="false"` a la plantilla del `<a-text>` en la segunda función generadora
      (línea ~225-234).
- [ ] 4.3 Verificar en `src/views/ARs/index.html` con el overlay de cono/espiral activo.

### Fase 5 — Validación cruzada y cierre

- [ ] 5.1 Revisar que ningún otro `<a-text>` sin `Ultra-msdf` haya cambiado de apariencia
      (comparar contra screenshots "antes" de la Fase 1).
- [ ] 5.2 `grep -rn "font-image.*Ultra-msdf" src/` y confirmar que cada resultado tiene
      `negate="false"` en el mismo bloque — asegura que no quedó ningún `<a-text>` con la fuente
      sin el atributo.
- [ ] 5.3 Marcar los criterios de la sección 6 como cumplidos.

## 8. Referencias

- Diagnóstico original de la causa raíz: `A-frame/english-vr/VR/Requerimientos/003-agregar-nuevas-canciones`,
  sección "Ajuste posterior" (busca "recuadro blanco sólido").
- Fix aplicado en el proyecto hermano: `A-frame/english-vr/VR/src/fonts.js`
  (commit `a0cccee092d75241170035b1286c947f25354f9d`).
- Documentación del componente `text` de A-Frame (propiedad `negate`):
  https://aframe.io/docs/1.4.0/components/text.html
