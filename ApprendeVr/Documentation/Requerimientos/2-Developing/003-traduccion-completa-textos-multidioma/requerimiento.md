# Requerimiento 003 — Traducción completa de textos de interfaz (multidioma)

## 1. Objetivo

Eliminar los textos hardcodeados en la interfaz de `ApprendeVr/frontend` y hacer que **todo** string
visible al usuario se obtenga desde los archivos de localización (`src/locales/{es,en,br}.json`) y se
consuma con `useVRLanguage().t()`, siguiendo el patrón que ya usa el título `appName`
(`src/components/VRDisplay.jsx`). El idioma se cambia desde la tuerca ⚙️ (`VRConfig.jsx` →
`VRLanguages.jsx`), y ese es el único mecanismo de traducción válido.

Hoy solo el título de la app y los labels del menú de configuración están traducidos. Todo lo demás
—botones de navegación, labels de sliders, pestañas, presets, overlays, comandos de voz, títulos de
páginas y mensajes— está escrito a mano en JSX/HTML, así que al cambiar de idioma **no se traduce**
(excepto `appName`).

## 2. Antecedentes y estado actual

- **Mecanismo activo:** `src/components/VRConfig/VRLanguageContext.jsx`. Carga todos los
  `../../locales/*.json` con `import.meta.glob` y expone `useVRLanguage()` →
  `{ t, currentLang, setCurrentLang, availableLanguages, isLoading }`.
- **`t('clave')`** resuelve claves anidadas (punto) contra el idioma actual y **devuelve la clave
  cruda si no la encuentra** (fallback silencioso): un typo o una clave ausente en un idioma se
  muestra tal cual en pantalla.
- **Regla de proyecto** (`Documentation/project.rules`, línea 7): *"All words or text displayed in
  the application must be obtained from localization files. Variables for text must be created in
  Spanish."* Las claves se definen en español.
- **Skill de referencia:** `.agents/skills/texto-multidioma/SKILL.md` documenta el flujo completo.
- **Legado que NO usar:** `src/i18n.js` (i18next) registra solo `en` y no es el flujo real. No
  agregar textos ahí.
- **Dato:** el `aria-label` de cierre del panel usa `t('close')` (`VRConfig.jsx:72`) pero la clave
  `close` no existe en ningún locale → hoy se ve literal "close". Es parte del alcance.

### 2.1 Claves ya existentes en `locales/`

`appName`, `greeting`, `welcomeMessage`, `vrButtonText`, `button.submit`, `error.notFound`,
`menu.title`, `menu.language`, `menu.viewMode`, `menu.theme`, `menu.theme_light`, `menu.theme_dark`.

## 3. Alcance

### Incluido

- Migrar a `t()` **todos** los textos listados en el checklist de la sección 7 (resultado de
  escanear el árbol `src/` con grep de nodos de texto JSX, `text=`, `value=`, `title=`,
  `aria-label`, `placeholder`, `alt` y títulos de `<title>`).
- Crear las claves nuevas **en español** en los **tres** locales (`es.json`, `en.json`, `br.json`),
  con la traducción correspondiente en cada idioma. `br.json` usa el tono "ñiño" existente.
- Reemplazar los literales por `t('clave')` en los componentes, manteniendo los emojis (📹, ⚙️,
  etc.) **en el string de los locales**, no concatenados en el JSX, para que sean traducibles.
- Incluir textos que hoy son interpolados (nº de overlays seleccionados, nº de overlays activos) con
  interpolación correcta (la función `t()` actual no soporta parámetros; ver sección 4).
- Los textos que son **datos dinámicos** (ej. `palabra.en`, `{label}`, URLs de video) **no** se
  traducen; solo los literales de plantilla que los rodean.

### No incluido

- Migrar textos de `console.log` / `console.error` (no son de interfaz).
- Traducir el contenido de las palabras/canciones/frases de la base de datos o del repo `A-frame`
  (eso es contenido, no chrome de UI).
- Reescribir el mecanismo de traducción para soportar interpolación con librería externa (i18next).
  Si se necesita interpolación, se resuelve con el enfoque mínimo descrito en la sección 4.
- Los `title="VR Local Video Overlay"` / `title="VRCone Overlay"` que son nombres internos de
  componente para devtools se dejan como están (marcados como "no prioritario" en el checklist),
  salvo que el usuario quiera traducirlos.
- Unificar `src/i18n.js` con `VRLanguageContext` (tarea futura aparte).

## 4. Diseño técnico

### Opción A — `t()` directo + claves planas (recomendada)

Replicar el patrón de `appName`: claves anidadas por dominio (ej. `home.backToHome`,
`config.resolution`, `overlays.cleanAll`), renderizadas con `{t('clave')}`. Para textos con
parámetros (p. ej. "🗑️ Limpiar todo (3)"), se propone una clave con marcador y reemplazo manual:

```jsx
// locales/es.json: "overlays.cleanAll": "🗑️ Limpiar todo ({count})"
const { t } = useVRLanguage();
<span>{t('overlays.cleanAll').replace('{count}', selectedCount)}</span>
```

Esto mantiene el mecanismo actual sin introducir dependencias nuevas.

### Opción B — migrar a i18next con interpolación (descartada)

i18next ya está instalado (`react-i18next` en `package.json`) y soporta interpolación `{{count}}`.
Descartada como parte de este requerimiento porque obligaría a reescribir `VRLanguageContext` para
que el `t()` global use i18next (hoy es una implementación propia), ampliando el alcance y el riesgo
sin beneficio inmediato. Se deja anotada como mejora futura.

**Decisión:** Opción A en todo el alcance.

### Convención de claves (español, anidadas por dominio)

| Dominio | Prefijo de clave | Ejemplos |
|---|---|---|
| Navegación / inicio | `home.` | `home.backToHome`, `home.back` |
| Pantalla principal (VRDisplay) | `display.` | `display.showDomo`, `display.bothViews`, `display.arStereo` |
| Botones del mundo 3D | `buttons.` | `buttons.vrR3f`, `buttons.aFrame`, `buttons.arStereo`, `buttons.arMirror` |
| Menú de configuración principal | `config.` | `config.showVrDisplay`, `config.close` |
| Panel ARS (ARSConfig) | `arsConfig.` | `arsConfig.resolution`, `arsConfig.separation`, `arsConfig.presets.mobile` |
| Help tooltip | `help.` | `help.separation`, `help.tips.1` |
| Panel de overlays | `overlays.` | `overlays.positions`, `overlays.videoConfig`, `overlays.cleanAll` |
| Registro de overlays (labels) | `overlayLabels.` | `overlayLabels.textoSimple`, `overlayLabels.cuboRotatorio` |
| Comandos de voz / video | `voice.` | `voice.ready`, `voice.commandsHint` |
| Títulos de documento | `titles.` | `titles.main`, `titles.mobile`, `titles.aFrame` |

## 5. Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/locales/es.json` | Agregar todas las claves nuevas (español). |
| `src/locales/en.json` | Agregar las mismas claves traducidas (inglés). |
| `src/locales/br.json` | Agregar las mismas claves traducidas (portugués "ñiño"). |
| `src/App.jsx` | Reemplazar `text=` de los 4 `VRButton` y el botón "Volver" por `t()`. |
| `src/components/VRDisplay.jsx` | Reemplazar "Mostrar Domo", "Ambas Vistas", "AR Stereo", "Loading..." por `t()`. |
| `src/components/VRConfig/VRConfig.jsx` | Reemplazar "Mostrar menú VRDisplay"; asegurar clave `close`. |
| `src/components/VRViews/VRButton.jsx` | Texto default `"VR"` → clave `t('buttons.vr')` (o mantener como fallback de prop). |
| `src/components/VRViews/VRDomo.jsx` | `value="Selecciona una palabra"` → `t()`. |
| `src/components/VRUser/VRScene.jsx` | `title="ENTER VR"` → `t()`. |
| `src/components/VRViews/VRViewARS/StereoARView.jsx` | "Volver", "Separación:", "Ancho:", "Alto:" → `t()`. |
| `src/views/ARs/appArs.jsx` | `text="Volver a inicio"` → `t()`. |
| `src/views/ARs/ARScomponents/ARSConfig.jsx` | Todos los labels/presets/botones del checklist → `t()`. |
| `src/views/ARs/ARScomponents/ARSHelpTooltip.jsx` | Encabezados, presets y consejos → `t()`. |
| `src/views/ARs/ARScomponents/OverlayConfigPanel.jsx` | Encabezados, placeholders, opciones de resolución → `t()`. |
| `src/views/ARs/ARScomponents/OverlayDropdownMenu.jsx` | Header, botones de acción, footer, `title`s → `t()`. |
| `src/views/ARs/ARScomponents/ARSoverlayList.jsx` | "Haz clic para activar/desactivar overlays" → `t()`. |
| `src/views/ARs/ARScomponents/overlays/index.js` | `label`/`description`/`category` → claves `t()`. |
| `src/views/ARs/ARScomponents/overlays/OverlayDebugger.jsx` | "Por tipo:", "Lista de overlays:", "Componente:" → `t()`. |
| `src/views/ARs/ARScomponents/ARSFloatingButton.jsx` | `aria-label="Activar modo ARS"`, `alt="ARS"` → `t()`. |
| `src/views/ARs/ARScomponents/ARSConfigStatus.jsx` | `title="Opciones de configuración"` → `t()`. |
| `src/views/ARs/ARScomponents/overlays/VRLocalVideoOverlay.jsx` | Comandos de voz, "OFF" → `t()`. |
| `src/views/ARs/ARScomponents/overlays/VRVoiceController.jsx` | "ON", "Listo para comandos de voz" → `t()`. |
| `src/views/ARs/ARScomponents/a-frame-components-ars/VRConeAFrameVideoOverlay.jsx` | "A-FRAME VIDEO TEST" → `t()`. |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/ARTestMirrorButton.jsx` | "← Inicio", `title` → `t()`. |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/SyncStereoTestView.jsx` | "Volver" → `t()`. |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/TestOverlayAR2.jsx` | "AR-TEST: espejo overlay" → `t()`. |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/VRLocalVideoOverlaySync.jsx` | Comandos de voz, "OFF" → `t()`. |
| `src/views/A-frame/index.html` | `<title>` y los dos `value=` de prueba → `t()` o claves. |
| `src/views/ARs/index.html`, `src/views/mobile/mobile.html`, `src/index.html` | `<title>` → traducible (o documentar que los títulos de HTML quedan estáticos). |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/artest-mirror.html` | `<title>` (opcional). |

## 6. Criterios de aceptación

- [x] Ningún string visible al usuario queda hardcodeado en los archivos listados en la sección 7
      (verificado con grep de nodos de texto y props de texto).
- [x] Cada clave nueva existe en `es.json`, `en.json` **y** `br.json` con traducción real (no copia
      del español en los 3).
- [x] Al cambiar de idioma desde la tuerca ⚙️, el título y **todos** los textos migrados cambian
      correctamente (es/en/br), sin mostrar claves crudas tipo `config.resolution` en pantalla.
- [x] No hay regresión en textos dinámicos: `palabra.en`, `{label}` y URLs de video siguen
      funcionando.
- [x] El `aria-label` de cierre del panel ya no muestra "close" crudo (clave `close` definida en los
      3 locales).
- [x] Los textos con parámetros ("Limpiar todo (n)", "n overlays disponibles • n activos") muestran
      el número correcto y la traducción del resto.

## 8. Referencias

- Regla de proyecto: `ApprendeVr/Documentation/project.rules` (línea 7).
- Skill de flujo i18n: `.agents/skills/texto-multidioma/SKILL.md`.
- Mecanismo activo: `src/components/VRConfig/VRLanguageContext.jsx`.
- Selector de idioma: `src/components/VRConfig/VRLanguages.jsx` (montado en `VRConfig.jsx`).
- Ejemplo canónico (título): `src/components/VRDisplay.jsx:27` (`t('appName')`).
