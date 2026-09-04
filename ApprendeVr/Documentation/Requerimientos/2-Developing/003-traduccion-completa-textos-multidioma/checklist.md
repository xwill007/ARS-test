# Checklist de ejecución (por vista y etapa)

> Inventario de textos a relacionar. Cada **vista** (página accesible) se descompone en **etapas**
> ordenadas para poder implementar y validar la traducción vista por vista, sin tocar todo a la vez.
> La etapa 0 (claves base) se hace primero porque las demás dependen de ella.

### Etapa 0 — Claves base y locales (prerequisito global)

- [x] Crear en los 3 locales la clave `close` (hoy `VRConfig.jsx:72` la usa y no existe).
- [x] Crear en los 3 locales la clave `common.loading` (fallback de `VRDisplay.jsx`).
- [x] Definir en `es.json`/`en.json`/`br.json` las claves de dominio listadas en la sección 4
      (`home.*`, `buttons.*`, `display.*`, `config.*`, `arsConfig.*`, `help.*`, `overlays.*`,
      `overlayLabels.*`, `voice.*`, `titles.*`, `domo.*`, `ars.*`).

### Vista 1 — Inicio (app principal, `/`)

Archivos: `src/App.jsx`, `src/components/VRDisplay.jsx`, `src/components/VRConfig/VRConfig.jsx`,
`src/components/VRViews/VRButton.jsx`.

#### Etapa 1.1 — Botones del mundo 3D y navegación (`App.jsx`)

- [x] `App.jsx:118` `text="VR-R3F"` → `t('buttons.vrR3f')`
- [x] `App.jsx:124` `text="A-FRAME"` → `t('buttons.aFrame')`
- [x] `App.jsx:130` `text="VR-AR STEREO"` → `t('buttons.arStereo')`
- [x] `App.jsx:138` `text="AR-mirror"` → `t('buttons.arMirror')`
- [x] `App.jsx:185` botón `"Volver"` → `t('home.back')`

#### Etapa 1.2 — Panel lateral VRDisplay (`VRDisplay.jsx`)

- [x] `VRDisplay.jsx:27` fallback `"Loading..."` → `t('common.loading')`
- [x] `VRDisplay.jsx:33` `"Mostrar Domo"` → `t('display.showDomo')`
- [x] `VRDisplay.jsx:39` `"Ambas Vistas"` → `t('display.bothViews')`
- [x] `VRDisplay.jsx:45` `"AR Stereo"` → `t('display.arStereo')`

#### Etapa 1.3 — Menú de configuración (tuerca ⚙️) (`VRConfig.jsx`, `VRButton.jsx`)

- [x] `VRConfig.jsx:131` `"Mostrar menú VRDisplay"` → `t('config.showVrDisplay')`
- [x] `VRConfig.jsx:72` `aria-label={t('close')}` — usar la clave `close` de la Etapa 0.
- [x] `VRButton.jsx:31` texto default `"VR"` → `t('buttons.vr')` (o documentar como fallback)

### Vista 2 — Componentes compartidos del mundo 3D (usados desde Inicio y AR)

Archivos: `src/components/VRViews/VRDomo.jsx`, `src/components/VRUser/VRScene.jsx`,
`src/components/VRViews/VRViewARS/StereoARView.jsx`.

#### Etapa 2.1 — Domo VR y escena (`VRDomo.jsx`, `VRScene.jsx`)

- [x] `VRDomo.jsx:568` `value="Selecciona una palabra"` → `t('domo.selectWord')`
- [x] `VRScene.jsx:13` `title="ENTER VR"` → `t('buttons.enterVr')`

#### Etapa 2.2 — Vista estéreo AR (`StereoARView.jsx`)

- [x] `StereoARView.jsx:89` `"Volver"` → `t('home.back')`
- [x] `StereoARView.jsx:93` `"Separación:"` → `t('config.separation')`
- [x] `StereoARView.jsx:94` `"Ancho:"` → `t('config.width')`
- [x] `StereoARView.jsx:95` `"Alto:"` → `t('config.height')`

### Vista 3 — Aplicación AR (`src/views/ARs/index.html`)

Archivos: `appArs.jsx`, `ARScomponents/ARSConfig.jsx`, `ARScomponents/ARSHelpTooltip.jsx`,
`ARScomponents/OverlayConfigPanel.jsx`, `ARScomponents/OverlayDropdownMenu.jsx`,
`ARScomponents/ARSoverlayList.jsx`, `ARScomponents/overlays/OverlayDebugger.jsx`,
`ARScomponents/ARSFloatingButton.jsx`, `ARScomponents/ARSConfigStatus.jsx`,
`ARScomponents/overlays/index.js`, `ARScomponents/overlays/VRLocalVideoOverlay.jsx`,
`ARScomponents/overlays/VRVoiceController.jsx`, `ARScomponents/a-frame-components-ars/VRConeAFrameVideoOverlay.jsx`.

#### Etapa 3.1 — Navegación de la vista AR (`appArs.jsx`)

- [x] `appArs.jsx:73` `text="Volver a inicio"` → `t('home.backToHome')`

#### Etapa 3.2 — Panel de configuración ARS (`ARSConfig.jsx`)

- [x] `ARSConfig.jsx:325` `aria-label` `"Ocultar menú"`/`"Mostrar menú"` → `t('arsConfig.hideMenu')`/`t('arsConfig.showMenu')`
- [x] `ARSConfig.jsx:358` `"🎛️ Configuración"` → `t('arsConfig.tab.config')`
- [x] `ARSConfig.jsx:376` `"📋 Overlays ({n})"` → `t('arsConfig.tab.overlays')` + contador
- [x] `ARSConfig.jsx:481` `"📹 Resolución"` → `t('arsConfig.resolution')`
- [x] `ARSConfig.jsx:505` `"📐 Separación"` → `t('arsConfig.separation')`
- [x] `ARSConfig.jsx:519` `"📏 Ancho"` → `t('arsConfig.width')`
- [x] `ARSConfig.jsx:533` `"📐 Alto"` → `t('arsConfig.height')`
- [x] `ARSConfig.jsx:547` `"⬅️ Offset I"` → `t('arsConfig.offsetLeft')`
- [x] `ARSConfig.jsx:561` `"➡️ Offset D"` → `t('arsConfig.offsetRight')`
- [x] `ARSConfig.jsx:575` `"🎮 Escala"` (corregir char roto `�`) → `t('arsConfig.scale')`
- [x] `ARSConfig.jsx:589` `"🔍 Zoom Cámara"` → `t('arsConfig.cameraZoom')`
- [x] `ARSConfig.jsx:619` `"⚡ Optimizar"` → `t('arsConfig.optimize')`
- [x] `ARSConfig.jsx:643` `"🪞 Espejo D"` → `t('arsConfig.mirrorRight')`
- [x] `ARSConfig.jsx:669` `"🔇 Silenciar D"` → `t('arsConfig.muteRight')`
- [x] `ARSConfig.jsx:695` `"🎯 Ocultar cursores"` → `t('arsConfig.hideCursors')`
- [x] `ARSConfig.jsx:703` `title="Oculta los cursores blancos…"` → `t('arsConfig.hideCursorsHint')`
- [x] `ARSConfig.jsx:713` `"Ocultar cursores blancos"` → `t('arsConfig.hideCursorsLabel')`
- [x] `ARSConfig.jsx:734` `"📱 Móvil"` → `t('arsConfig.presets.mobile')`
- [x] `ARSConfig.jsx:750` `"💻 Desktop"` → `t('arsConfig.presets.desktop')`
- [x] `ARSConfig.jsx:766` `"🥽 VR"` → `t('arsConfig.presets.vr')`
- [x] `ARSConfig.jsx:803` `"💾 Guardar Configuración"` → `t('arsConfig.save')`
- [x] `ARSConfig.jsx:795` `"✓ Guardado"` → `t('arsConfig.saved')`
- [x] `ARSConfig.jsx:817` `"🎛️ Selección de Overlays"` (corregir char roto) → `t('arsConfig.overlaySelection')`

#### Etapa 3.3 — Tooltip de ayuda (`ARSHelpTooltip.jsx`)

- [x] `ARSHelpTooltip.jsx:71` `"📐 Separación"` → `t('help.separation')`
- [x] `ARSHelpTooltip.jsx:78` `"📏 Ancho y Alto"` → `t('help.widthHeight')`
- [x] `ARSHelpTooltip.jsx:85` `"⬅️➡️ Offset Izquierdo/Derecho"` → `t('help.offset')`
- [x] `ARSHelpTooltip.jsx:92` `"🔍 Zoom"` → `t('help.zoom')`
- [x] `ARSHelpTooltip.jsx:99` `"⚡ Presets Rápidos"` → `t('help.presets')`
- [x] `ARSHelpTooltip.jsx:107` `"📱 Móvil"` → `t('arsConfig.presets.mobile')`
- [x] `ARSHelpTooltip.jsx:114` `"💻 Desktop"` → `t('arsConfig.presets.desktop')`
- [x] `ARSHelpTooltip.jsx:121` `"🥽 VR"` → `t('arsConfig.presets.vr')`
- [x] `ARSHelpTooltip.jsx:135` `"💡 Consejos"` → `t('help.tips.title')`
- [x] `ARSHelpTooltip.jsx:137` tip `"Mantén la separación entre 20-60px…"` → `t('help.tips.1')`
- [x] `ARSHelpTooltip.jsx:138` tip `"Los offsets pequeños (-20 a +20px)…"` → `t('help.tips.2')`
- [x] `ARSHelpTooltip.jsx:139` tip `"Guarda tu configuración para uso futuro"` → `t('help.tips.3')`
- [x] `ARSHelpTooltip.jsx:140` tip `"Prueba los presets antes de ajustar manualmente"` → `t('help.tips.4')`

#### Etapa 3.4 — Panel de configuración de overlays (`OverlayConfigPanel.jsx`)

- [x] `OverlayConfigPanel.jsx:449` `"Posiciones"` → `t('overlays.positions')`
- [x] `OverlayConfigPanel.jsx:465` `"Escalas"` → `t('overlays.scales')`
- [x] `OverlayConfigPanel.jsx:476` `"Configuración de Videos"` → `t('overlays.videoConfig')`
- [x] `OverlayConfigPanel.jsx:492` `placeholder="Ej: /videos/sample.mp4…"` → `t('overlays.videoPlaceholder')`
- [x] `OverlayConfigPanel.jsx:529` `"Automática"` → `t('overlays.resolution.auto')`
- [x] `OverlayConfigPanel.jsx:530` `"480p"` → (valor técnico, sin traducción)
- [x] `OverlayConfigPanel.jsx:531` `"720p"` → (valor técnico, sin traducción)
- [x] `OverlayConfigPanel.jsx:532` `"1080p"` → (valor técnico, sin traducción)
- [x] `OverlayConfigPanel.jsx:560` `"📹 Video Local A-Frame"` → `t('overlayLabels.videoLocalAframe')`
- [x] `OverlayConfigPanel.jsx:576` `placeholder="/videos/gangstas.mp4"` → (ruta, sin traducción)
- [x] `OverlayConfigPanel.jsx:715` `"Videos de Prueba"` → `t('overlays.testVideos')`
- [x] `OverlayConfigPanel.jsx:757` `"Configuración General"` → `t('overlays.generalConfig')`

#### Etapa 3.5 — Dropdown de overlays (`OverlayDropdownMenu.jsx`)

- [x] `OverlayDropdownMenu.jsx:295` `"📋 OVERLAYS"` → `t('overlays.title')`
- [x] `OverlayDropdownMenu.jsx:322` `"Selecciona múltiples overlays"`/`"Selecciona un overlay"` → `t('overlays.selectMultiple')`/`t('overlays.selectOne')`
- [x] `OverlayDropdownMenu.jsx:432` `title="Configurar posición y parámetros"` → `t('overlays.configure')`
- [x] `OverlayDropdownMenu.jsx:456` `"🗑️ Limpiar todo ({n})"` → `t('overlays.cleanAll')` + contador
- [x] `OverlayDropdownMenu.jsx:476` `"🔄 Resetear a Defaults"` → `t('overlays.resetDefaults')`
- [x] `OverlayDropdownMenu.jsx:474` `title="Resetear a la configuración…"` → `t('overlays.resetHint')`
- [x] `OverlayDropdownMenu.jsx:489` `"{n} overlays disponibles • {n} activos"` → `t('overlays.footer')` + interpolación
- [x] `OverlayDropdownMenu.jsx:509` `title="Arrastrar para redimensionar"` → `t('overlays.dragResize')`

#### Etapa 3.6 — Registro de overlays (`overlays/index.js`)

- [x] `"Cono R3F"` / `"Cono 3D usando React Three Fiber"` / `geometry` → claves `overlayLabels.*`
- [x] `"Texto Simple"` / `"Overlay de texto 3D simple"` / `text` → claves `overlayLabels.*`
- [x] `"Cubo Rotatorio"` / `"Cubo 3D que rota continuamente"` / `geometry` → claves
- [x] `"Overlay Estático"` / `"Overlay R3F básico para pruebas"` / `test` → claves
- [x] `"Video Cono R3F"` / `"Video proyectado en cono R3F - Configurable"` / `video` → claves
- [x] `"Video Cono R3F (Original)"` / descripción / `video` → claves
- [x] `"Cono de Palabras"` / `"Cono 3D con palabras en A-Frame"` / `educational` → claves
- [x] `"Video Local A-Frame"` / `"Reproductor de video local con controles…"` / `video` → claves
- [x] `"Cono de Palabras + Video Local (A-Frame)"` / descripción / `combinado` → claves

#### Etapa 3.7 — Lista de overlays, debug y botón flotante (`ARSoverlayList`, `OverlayDebugger`, `ARSFloatingButton`, `ARSConfigStatus`)

- [x] `ARSoverlayList.jsx:107` `"Haz clic para activar/desactivar overlays"` → `t('overlays.clickHint')`
- [x] `OverlayDebugger.jsx:49` `"Por tipo:"` → `t('overlays.byType')`
- [x] `OverlayDebugger.jsx:57` `"Lista de overlays:"` → `t('overlays.list')`
- [x] `OverlayDebugger.jsx:124` `"Componente:"` → `t('overlays.component')`
- [x] `ARSFloatingButton.jsx:46` `aria-label="Activar modo ARS"` → `t('ars.activate')`
- [x] `ARSFloatingButton.jsx:50` `alt="ARS"` → (sigla, sin traducción)
- [x] `ARSConfigStatus.jsx:70` `title="Opciones de configuración"` → `t('config.options')`

#### Etapa 3.8 — Overlays de video/voz (`VRLocalVideoOverlay`, `VRVoiceController`, `VRConeAFrameVideoOverlay`)

- [x] `VRLocalVideoOverlay.jsx:329` `value="OFF"` → `t('voice.off')`
- [x] `VRLocalVideoOverlay.jsx:341` `value="🎤 Comandos: 'play', 'pause', …"` → `t('voice.commandsHint')`
- [x] `VRVoiceController.jsx:81` `value="ON"` → `t('voice.on')`
- [x] `VRVoiceController.jsx:95` `value="Listo para comandos de voz"` → `t('voice.ready')`
- [x] `VRConeAFrameVideoOverlay.jsx:107` `value="A-FRAME VIDEO TEST"` → `t('overlays.aframeVideoTest')`

### Vista 4 — Móvil (`src/views/mobile/mobile.html`)

#### Etapa 4.1 — Título y chrome

- [x] `mobile.html:10` `<title>VR Experience Mobile</title>` → `t('titles.mobile')`
- [x] Verificar que `appMobil.jsx` no introduce textos visibles sin migrar (hoy solo usa
      `VRTextTranslation` con `welcomeMessage`, ya traducible).

### Vista 5 — A-Frame standalone (`src/views/A-frame/index.html`)

#### Etapa 5.1 — Título y textos de prueba

- [x] `A-frame/index.html:5` `<title>A-Frame VR Scene</title>` → `t('titles.aFrame')` — página standalone A-Frame sin React/selector de idioma; el `<title>` queda estático (decisión, sin traducción).
- [x] `A-frame/index.html:72` `value="á é í ó ú ñ"` → (texto de prueba de fuente, sin traducción)
- [x] `A-frame/index.html:89` `value="msdf-ultra á,é,í,ó,ú,ñ"` → (texto de prueba de fuente, sin traducción)

### Vista 6 — Prueba temporal mirror-fix (`artest-mirror.html`)

Archivos: `ARStest/mirror-fix/ARTestMirrorButton.jsx`, `SyncStereoTestView.jsx`,
`TestOverlayAR2.jsx`, `VRLocalVideoOverlaySync.jsx`, `artest-mirror.html`.

#### Etapa 6.1 — Botones de navegación

- [x] `ARTestMirrorButton.jsx:59` `"← Inicio"` + `title="Volver al inicio"` → `t('home.backToHome')`
- [x] `SyncStereoTestView.jsx:159` `"Volver"` → `t('home.back')`

#### Etapa 6.2 — Textos de prueba

- [x] `TestOverlayAR2.jsx:31` `value="AR-TEST: espejo overlay"` → `t('overlays.mirrorTest')`
- [x] `VRLocalVideoOverlaySync.jsx:340` `value="OFF"` → `t('voice.off')`
- [x] `VRLocalVideoOverlaySync.jsx:352` `value="🎤 Comandos: …"` → `t('voice.commandsHint')`
- [x] `VRDomoOverlay.jsx:14` `value="ÑOÑO"` → (texto de prueba, sin traducción)
- [x] `artest-mirror.html:6` `<title>AR Test — Espejo overlay…</title>` (opcional)

### Etapa final — Verificación y cierre (todas las vistas)

- [x] `grep -rnE ">[^<>{}]*[A-Za-záéíóúñ][^<>{}]*<" src/` no arroja textos de UI sin migrar
      (excluyendo comentarios y `console.*`; solo quedan valores técnicos `480p/720p/1080p`).
- [x] Cada clave nueva está en los 3 locales y ninguna queda con el mismo valor que la clave.
- [x] Prueba manual por vista: cambiar idioma en ⚙️ y recorrer Inicio, AR, Móvil, A-Frame y
      mirror-fix, confirmando traducción es/en/br en cada una.
