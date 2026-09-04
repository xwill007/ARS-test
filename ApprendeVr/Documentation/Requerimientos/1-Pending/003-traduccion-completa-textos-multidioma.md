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

- [ ] Ningún string visible al usuario queda hardcodeado en los archivos listados en la sección 7
      (verificado con grep de nodos de texto y props de texto).
- [ ] Cada clave nueva existe en `es.json`, `en.json` **y** `br.json` con traducción real (no copia
      del español en los 3).
- [ ] Al cambiar de idioma desde la tuerca ⚙️, el título y **todos** los textos migrados cambian
      correctamente (es/en/br), sin mostrar claves crudas tipo `config.resolution` en pantalla.
- [ ] No hay regresión en textos dinámicos: `palabra.en`, `{label}` y URLs de video siguen
      funcionando.
- [ ] El `aria-label` de cierre del panel ya no muestra "close" crudo (clave `close` definida en los
      3 locales).
- [ ] Los textos con parámetros ("Limpiar todo (n)", "n overlays disponibles • n activos") muestran
      el número correcto y la traducción del resto.

## 7. Checklist de ejecución (por vista y etapa)

> Inventario de textos a relacionar. Cada **vista** (página accesible) se descompone en **etapas**
> ordenadas para poder implementar y validar la traducción vista por vista, sin tocar todo a la vez.
> La etapa 0 (claves base) se hace primero porque las demás dependen de ella.

### Etapa 0 — Claves base y locales (prerequisito global)

- [ ] Crear en los 3 locales la clave `close` (hoy `VRConfig.jsx:72` la usa y no existe).
- [ ] Crear en los 3 locales la clave `common.loading` (fallback de `VRDisplay.jsx`).
- [ ] Definir en `es.json`/`en.json`/`br.json` las claves de dominio listadas en la sección 4
      (`home.*`, `buttons.*`, `display.*`, `config.*`, `arsConfig.*`, `help.*`, `overlays.*`,
      `overlayLabels.*`, `voice.*`, `titles.*`, `domo.*`, `ars.*`).

### Vista 1 — Inicio (app principal, `/`)

Archivos: `src/App.jsx`, `src/components/VRDisplay.jsx`, `src/components/VRConfig/VRConfig.jsx`,
`src/components/VRViews/VRButton.jsx`.

#### Etapa 1.1 — Botones del mundo 3D y navegación (`App.jsx`)

- [ ] `App.jsx:118` `text="VR-R3F"` → `t('buttons.vrR3f')`
- [ ] `App.jsx:124` `text="A-FRAME"` → `t('buttons.aFrame')`
- [ ] `App.jsx:130` `text="VR-AR STEREO"` → `t('buttons.arStereo')`
- [ ] `App.jsx:138` `text="AR-mirror"` → `t('buttons.arMirror')`
- [ ] `App.jsx:185` botón `"Volver"` → `t('home.back')`

#### Etapa 1.2 — Panel lateral VRDisplay (`VRDisplay.jsx`)

- [ ] `VRDisplay.jsx:27` fallback `"Loading..."` → `t('common.loading')`
- [ ] `VRDisplay.jsx:33` `"Mostrar Domo"` → `t('display.showDomo')`
- [ ] `VRDisplay.jsx:39` `"Ambas Vistas"` → `t('display.bothViews')`
- [ ] `VRDisplay.jsx:45` `"AR Stereo"` → `t('display.arStereo')`

#### Etapa 1.3 — Menú de configuración (tuerca ⚙️) (`VRConfig.jsx`, `VRButton.jsx`)

- [ ] `VRConfig.jsx:131` `"Mostrar menú VRDisplay"` → `t('config.showVrDisplay')`
- [ ] `VRConfig.jsx:72` `aria-label={t('close')}` — usar la clave `close` de la Etapa 0.
- [ ] `VRButton.jsx:31` texto default `"VR"` → `t('buttons.vr')` (o documentar como fallback)

### Vista 2 — Componentes compartidos del mundo 3D (usados desde Inicio y AR)

Archivos: `src/components/VRViews/VRDomo.jsx`, `src/components/VRUser/VRScene.jsx`,
`src/components/VRViews/VRViewARS/StereoARView.jsx`.

#### Etapa 2.1 — Domo VR y escena (`VRDomo.jsx`, `VRScene.jsx`)

- [ ] `VRDomo.jsx:568` `value="Selecciona una palabra"` → `t('domo.selectWord')`
- [ ] `VRScene.jsx:13` `title="ENTER VR"` → `t('buttons.enterVr')`

#### Etapa 2.2 — Vista estéreo AR (`StereoARView.jsx`)

- [ ] `StereoARView.jsx:89` `"Volver"` → `t('home.back')`
- [ ] `StereoARView.jsx:93` `"Separación:"` → `t('config.separation')`
- [ ] `StereoARView.jsx:94` `"Ancho:"` → `t('config.width')`
- [ ] `StereoARView.jsx:95` `"Alto:"` → `t('config.height')`

### Vista 3 — Aplicación AR (`src/views/ARs/index.html`)

Archivos: `appArs.jsx`, `ARScomponents/ARSConfig.jsx`, `ARScomponents/ARSHelpTooltip.jsx`,
`ARScomponents/OverlayConfigPanel.jsx`, `ARScomponents/OverlayDropdownMenu.jsx`,
`ARScomponents/ARSoverlayList.jsx`, `ARScomponents/overlays/OverlayDebugger.jsx`,
`ARScomponents/ARSFloatingButton.jsx`, `ARScomponents/ARSConfigStatus.jsx`,
`ARScomponents/overlays/index.js`, `ARScomponents/overlays/VRLocalVideoOverlay.jsx`,
`ARScomponents/overlays/VRVoiceController.jsx`, `ARScomponents/a-frame-components-ars/VRConeAFrameVideoOverlay.jsx`.

#### Etapa 3.1 — Navegación de la vista AR (`appArs.jsx`)

- [ ] `appArs.jsx:73` `text="Volver a inicio"` → `t('home.backToHome')`

#### Etapa 3.2 — Panel de configuración ARS (`ARSConfig.jsx`)

- [ ] `ARSConfig.jsx:325` `aria-label` `"Ocultar menú"`/`"Mostrar menú"` → `t('arsConfig.hideMenu')`/`t('arsConfig.showMenu')`
- [ ] `ARSConfig.jsx:358` `"🎛️ Configuración"` → `t('arsConfig.tab.config')`
- [ ] `ARSConfig.jsx:376` `"📋 Overlays ({n})"` → `t('arsConfig.tab.overlays')` + contador
- [ ] `ARSConfig.jsx:481` `"📹 Resolución"` → `t('arsConfig.resolution')`
- [ ] `ARSConfig.jsx:505` `"📐 Separación"` → `t('arsConfig.separation')`
- [ ] `ARSConfig.jsx:519` `"📏 Ancho"` → `t('arsConfig.width')`
- [ ] `ARSConfig.jsx:533` `"📐 Alto"` → `t('arsConfig.height')`
- [ ] `ARSConfig.jsx:547` `"⬅️ Offset I"` → `t('arsConfig.offsetLeft')`
- [ ] `ARSConfig.jsx:561` `"➡️ Offset D"` → `t('arsConfig.offsetRight')`
- [ ] `ARSConfig.jsx:575` `"🎮 Escala"` (corregir char roto `�`) → `t('arsConfig.scale')`
- [ ] `ARSConfig.jsx:589` `"🔍 Zoom Cámara"` → `t('arsConfig.cameraZoom')`
- [ ] `ARSConfig.jsx:619` `"⚡ Optimizar"` → `t('arsConfig.optimize')`
- [ ] `ARSConfig.jsx:643` `"🪞 Espejo D"` → `t('arsConfig.mirrorRight')`
- [ ] `ARSConfig.jsx:669` `"🔇 Silenciar D"` → `t('arsConfig.muteRight')`
- [ ] `ARSConfig.jsx:695` `"🎯 Ocultar cursores"` → `t('arsConfig.hideCursors')`
- [ ] `ARSConfig.jsx:703` `title="Oculta los cursores blancos…"` → `t('arsConfig.hideCursorsHint')`
- [ ] `ARSConfig.jsx:713` `"Ocultar cursores blancos"` → `t('arsConfig.hideCursorsLabel')`
- [ ] `ARSConfig.jsx:734` `"📱 Móvil"` → `t('arsConfig.presets.mobile')`
- [ ] `ARSConfig.jsx:750` `"💻 Desktop"` → `t('arsConfig.presets.desktop')`
- [ ] `ARSConfig.jsx:766` `"🥽 VR"` → `t('arsConfig.presets.vr')`
- [ ] `ARSConfig.jsx:803` `"💾 Guardar Configuración"` → `t('arsConfig.save')`
- [ ] `ARSConfig.jsx:795` `"✓ Guardado"` → `t('arsConfig.saved')`
- [ ] `ARSConfig.jsx:817` `"🎛️ Selección de Overlays"` (corregir char roto) → `t('arsConfig.overlaySelection')`

#### Etapa 3.3 — Tooltip de ayuda (`ARSHelpTooltip.jsx`)

- [ ] `ARSHelpTooltip.jsx:71` `"📐 Separación"` → `t('help.separation')`
- [ ] `ARSHelpTooltip.jsx:78` `"📏 Ancho y Alto"` → `t('help.widthHeight')`
- [ ] `ARSHelpTooltip.jsx:85` `"⬅️➡️ Offset Izquierdo/Derecho"` → `t('help.offset')`
- [ ] `ARSHelpTooltip.jsx:92` `"🔍 Zoom"` → `t('help.zoom')`
- [ ] `ARSHelpTooltip.jsx:99` `"⚡ Presets Rápidos"` → `t('help.presets')`
- [ ] `ARSHelpTooltip.jsx:107` `"📱 Móvil"` → `t('arsConfig.presets.mobile')`
- [ ] `ARSHelpTooltip.jsx:114` `"💻 Desktop"` → `t('arsConfig.presets.desktop')`
- [ ] `ARSHelpTooltip.jsx:121` `"🥽 VR"` → `t('arsConfig.presets.vr')`
- [ ] `ARSHelpTooltip.jsx:135` `"💡 Consejos"` → `t('help.tips.title')`
- [ ] `ARSHelpTooltip.jsx:137` tip `"Mantén la separación entre 20-60px…"` → `t('help.tips.1')`
- [ ] `ARSHelpTooltip.jsx:138` tip `"Los offsets pequeños (-20 a +20px)…"` → `t('help.tips.2')`
- [ ] `ARSHelpTooltip.jsx:139` tip `"Guarda tu configuración para uso futuro"` → `t('help.tips.3')`
- [ ] `ARSHelpTooltip.jsx:140` tip `"Prueba los presets antes de ajustar manualmente"` → `t('help.tips.4')`

#### Etapa 3.4 — Panel de configuración de overlays (`OverlayConfigPanel.jsx`)

- [ ] `OverlayConfigPanel.jsx:449` `"Posiciones"` → `t('overlays.positions')`
- [ ] `OverlayConfigPanel.jsx:465` `"Escalas"` → `t('overlays.scales')`
- [ ] `OverlayConfigPanel.jsx:476` `"Configuración de Videos"` → `t('overlays.videoConfig')`
- [ ] `OverlayConfigPanel.jsx:492` `placeholder="Ej: /videos/sample.mp4…"` → `t('overlays.videoPlaceholder')`
- [ ] `OverlayConfigPanel.jsx:529` `"Automática"` → `t('overlays.resolution.auto')`
- [ ] `OverlayConfigPanel.jsx:530` `"480p"` → (valor técnico, sin traducción)
- [ ] `OverlayConfigPanel.jsx:531` `"720p"` → (valor técnico, sin traducción)
- [ ] `OverlayConfigPanel.jsx:532` `"1080p"` → (valor técnico, sin traducción)
- [ ] `OverlayConfigPanel.jsx:560` `"📹 Video Local A-Frame"` → `t('overlayLabels.videoLocalAframe')`
- [ ] `OverlayConfigPanel.jsx:576` `placeholder="/videos/gangstas.mp4"` → (ruta, sin traducción)
- [ ] `OverlayConfigPanel.jsx:715` `"Videos de Prueba"` → `t('overlays.testVideos')`
- [ ] `OverlayConfigPanel.jsx:757` `"Configuración General"` → `t('overlays.generalConfig')`

#### Etapa 3.5 — Dropdown de overlays (`OverlayDropdownMenu.jsx`)

- [ ] `OverlayDropdownMenu.jsx:295` `"📋 OVERLAYS"` → `t('overlays.title')`
- [ ] `OverlayDropdownMenu.jsx:322` `"Selecciona múltiples overlays"`/`"Selecciona un overlay"` → `t('overlays.selectMultiple')`/`t('overlays.selectOne')`
- [ ] `OverlayDropdownMenu.jsx:432` `title="Configurar posición y parámetros"` → `t('overlays.configure')`
- [ ] `OverlayDropdownMenu.jsx:456` `"🗑️ Limpiar todo ({n})"` → `t('overlays.cleanAll')` + contador
- [ ] `OverlayDropdownMenu.jsx:476` `"🔄 Resetear a Defaults"` → `t('overlays.resetDefaults')`
- [ ] `OverlayDropdownMenu.jsx:474` `title="Resetear a la configuración…"` → `t('overlays.resetHint')`
- [ ] `OverlayDropdownMenu.jsx:489` `"{n} overlays disponibles • {n} activos"` → `t('overlays.footer')` + interpolación
- [ ] `OverlayDropdownMenu.jsx:509` `title="Arrastrar para redimensionar"` → `t('overlays.dragResize')`

#### Etapa 3.6 — Registro de overlays (`overlays/index.js`)

- [ ] `"Cono R3F"` / `"Cono 3D usando React Three Fiber"` / `geometry` → claves `overlayLabels.*`
- [ ] `"Texto Simple"` / `"Overlay de texto 3D simple"` / `text` → claves `overlayLabels.*`
- [ ] `"Cubo Rotatorio"` / `"Cubo 3D que rota continuamente"` / `geometry` → claves
- [ ] `"Overlay Estático"` / `"Overlay R3F básico para pruebas"` / `test` → claves
- [ ] `"Video Cono R3F"` / `"Video proyectado en cono R3F - Configurable"` / `video` → claves
- [ ] `"Video Cono R3F (Original)"` / descripción / `video` → claves
- [ ] `"Cono de Palabras"` / `"Cono 3D con palabras en A-Frame"` / `educational` → claves
- [ ] `"Video Local A-Frame"` / `"Reproductor de video local con controles…"` / `video` → claves
- [ ] `"Cono de Palabras + Video Local (A-Frame)"` / descripción / `combinado` → claves

#### Etapa 3.7 — Lista de overlays, debug y botón flotante (`ARSoverlayList`, `OverlayDebugger`, `ARSFloatingButton`, `ARSConfigStatus`)

- [ ] `ARSoverlayList.jsx:107` `"Haz clic para activar/desactivar overlays"` → `t('overlays.clickHint')`
- [ ] `OverlayDebugger.jsx:49` `"Por tipo:"` → `t('overlays.byType')`
- [ ] `OverlayDebugger.jsx:57` `"Lista de overlays:"` → `t('overlays.list')`
- [ ] `OverlayDebugger.jsx:124` `"Componente:"` → `t('overlays.component')`
- [ ] `ARSFloatingButton.jsx:46` `aria-label="Activar modo ARS"` → `t('ars.activate')`
- [ ] `ARSFloatingButton.jsx:50` `alt="ARS"` → (sigla, sin traducción)
- [ ] `ARSConfigStatus.jsx:70` `title="Opciones de configuración"` → `t('config.options')`

#### Etapa 3.8 — Overlays de video/voz (`VRLocalVideoOverlay`, `VRVoiceController`, `VRConeAFrameVideoOverlay`)

- [ ] `VRLocalVideoOverlay.jsx:329` `value="OFF"` → `t('voice.off')`
- [ ] `VRLocalVideoOverlay.jsx:341` `value="🎤 Comandos: 'play', 'pause', …"` → `t('voice.commandsHint')`
- [ ] `VRVoiceController.jsx:81` `value="ON"` → `t('voice.on')`
- [ ] `VRVoiceController.jsx:95` `value="Listo para comandos de voz"` → `t('voice.ready')`
- [ ] `VRConeAFrameVideoOverlay.jsx:107` `value="A-FRAME VIDEO TEST"` → `t('overlays.aframeVideoTest')`

### Vista 4 — Móvil (`src/views/mobile/mobile.html`)

#### Etapa 4.1 — Título y chrome

- [ ] `mobile.html:10` `<title>VR Experience Mobile</title>` → `t('titles.mobile')`
- [ ] Verificar que `appMobil.jsx` no introduce textos visibles sin migrar (hoy solo usa
      `VRTextTranslation` con `welcomeMessage`, ya traducible).

### Vista 5 — A-Frame standalone (`src/views/A-frame/index.html`)

#### Etapa 5.1 — Título y textos de prueba

- [ ] `A-frame/index.html:5` `<title>A-Frame VR Scene</title>` → `t('titles.aFrame')`
- [ ] `A-frame/index.html:72` `value="á é í ó ú ñ"` → (texto de prueba de fuente, sin traducción)
- [ ] `A-frame/index.html:89` `value="msdf-ultra á,é,í,ó,ú,ñ"` → (texto de prueba de fuente, sin traducción)

### Vista 6 — Prueba temporal mirror-fix (`artest-mirror.html`)

Archivos: `ARStest/mirror-fix/ARTestMirrorButton.jsx`, `SyncStereoTestView.jsx`,
`TestOverlayAR2.jsx`, `VRLocalVideoOverlaySync.jsx`, `artest-mirror.html`.

#### Etapa 6.1 — Botones de navegación

- [ ] `ARTestMirrorButton.jsx:59` `"← Inicio"` + `title="Volver al inicio"` → `t('home.backToHome')`
- [ ] `SyncStereoTestView.jsx:159` `"Volver"` → `t('home.back')`

#### Etapa 6.2 — Textos de prueba

- [ ] `TestOverlayAR2.jsx:31` `value="AR-TEST: espejo overlay"` → `t('overlays.mirrorTest')`
- [ ] `VRLocalVideoOverlaySync.jsx:340` `value="OFF"` → `t('voice.off')`
- [ ] `VRLocalVideoOverlaySync.jsx:352` `value="🎤 Comandos: …"` → `t('voice.commandsHint')`
- [ ] `VRDomoOverlay.jsx:14` `value="ÑOÑO"` → (texto de prueba, sin traducción)
- [ ] `artest-mirror.html:6` `<title>AR Test — Espejo overlay…</title>` (opcional)

### Etapa final — Verificación y cierre (todas las vistas)

- [ ] `grep -rnE ">[^<>{}]*[A-Za-záéíóúñ][^<>{}]*<" src/` no arroja textos de UI sin migrar
      (excluyendo comentarios y `console.*`).
- [ ] Cada clave nueva está en los 3 locales y ninguna queda con el mismo valor que la clave.
- [ ] Prueba manual por vista: cambiar idioma en ⚙️ y recorrer Inicio, AR, Móvil, A-Frame y
      mirror-fix, confirmando traducción es/en/br en cada una.

## 8. Referencias

- Regla de proyecto: `ApprendeVr/Documentation/project.rules` (línea 7).
- Skill de flujo i18n: `.agents/skills/texto-multidioma/SKILL.md`.
- Mecanismo activo: `src/components/VRConfig/VRLanguageContext.jsx`.
- Selector de idioma: `src/components/VRConfig/VRLanguages.jsx` (montado en `VRConfig.jsx`).
- Ejemplo canónico (título): `src/components/VRDisplay.jsx:27` (`t('appName')`).
