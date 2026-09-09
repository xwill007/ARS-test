# Checklist de ejecución — Requerimiento 013

## Fase 1 — Geometría y layout de la brújula (sin interacción todavía)

- [ ] Crear `SyncConfigCompassMenu.jsx` con `<iframe srcDoc>` y `<a-scene embedded
      vr-mode-ui="enabled: false">` (mismo patrón que `VRConeOverlaySync.jsx`), cámara con
      `<a-cursor>` reticle (sin componente `cursor="fuse:..."` nativo, mismo criterio que el
      resto de `mirror-fix`).
- [ ] Círculo en el suelo (`y≈0`, mirando hacia arriba) con el triángulo de norte fijo (no rota),
      alineado con -Z.
- [ ] Grupo de porciones (`<a-entity>` rotable en Y) con las 2 secciones actuales
      (Configuración/Overlays) como cuñas de la torta, con `<a-text>` de título reusando
      `arsConfig.tab.config`/`arsConfig.tab.overlays` vía `useVRLanguage()`.
- [ ] Dos flechas visibles en el borde del círculo (aún sin funcionalidad de click).
- [ ] Verificar visualmente en navegador (Claude en Chrome o manual) que la brújula se ve
      correctamente en el suelo de cada panel estéreo, sin errores de consola.

## Fase 2 — Interacción: flechas y selección de porción

- [ ] Marcar flechas y porciones como `.clickable`, agregar al `<a-cursor raycaster>`.
- [ ] Script propio de hover/dwell/click (mismo patrón que `VRConeOverlaySync.jsx`:
      `FUSE_MS`/`COOLDOWN_MS`, agrupado por elemento lógico, no por mesh — evitar el bug corregido
      por el commit `dea919b`).
- [ ] Click directo en flecha rota el grupo de porciones `360°/N` grados en el sentido
      correspondiente; verificar ambos sentidos.
- [ ] Apuntado sostenido (dwell) en una flecha también la activa, con el mismo feedback visual
      rojo/achicado que ya usan cono/video.
- [ ] Click directo y dwell en una porción marcan esa sección como "activa" (estado en el
      componente, todavía sin mostrar panel).
- [ ] Verificar en navegador: rotar con ambas flechas, confirmar que la porción activa se puede
      ubicar junto al triángulo de norte con clicks directos y con dwell.

## Fase 3 — Panel de sección al frente del usuario

- [ ] Migrar el contenido de las dos pestañas de `SyncConfigMenu.jsx` (sliders de
      separación/ancho/alto, checkboxes de overlays, botones guardar, indicador de sesión) a
      subcomponentes reutilizables desde `SyncConfigCompassMenu.jsx`.
- [ ] Mostrar el panel HTML de la sección activa centrado en pantalla ("al frente"), no en la
      esquina superior izquierda.
- [ ] Ocultar el panel cuando deja de apuntarse/seleccionarse esa porción (o se usa su botón ✕).
- [ ] Confirmar que separación/ancho/alto siguen actualizando los paneles estéreo en vivo, igual
      que hoy.
- [ ] Confirmar que guardar cada sección (`getUserSetting`/`saveUserSetting`,
      `OVERLAYS_SETTINGS_VIEW`/`CONFIG_SETTINGS_VIEW`) sigue funcionando igual que hoy (feedback
      gris al guardar, vuelve a color al modificar).
- [ ] Verificar en navegador: cada slider/checkbox del panel migrado responde igual que en el
      menú 2D actual.

## Fase 4 — Retirar el menú/botón viejos e integrar en `SyncStereoTestView.jsx`

- [ ] Quitar `menuButtonStyle`, botón ☰ y estado `showMenu` de `SyncStereoTestView.jsx`.
- [ ] Montar `SyncConfigCompassMenu` como capa siempre activa (`layerStyle`) en ambos paneles
      (izquierdo/derecho), pasando las mismas props que hoy recibía `SyncConfigMenu`.
- [ ] Decidir y aplicar si `SyncConfigMenu.jsx` se retira o queda como contenedor de los
      subcomponentes compartidos (ver Fase 3).
- [ ] Verificar en navegador: la brújula aparece y funciona igual en ambos paneles, sin rastro del
      botón ☰ ni del panel fijo anterior.

## Fase 5 — Textos e i18n

- [ ] Agregar claves nuevas de i18n a `src/locales/{es,en,br}.json` si se necesitaron textos
      nuevos (instrucciones, aria-labels de flechas).
- [ ] Correr `npm run check:i18n` (en `ApprendeVr/frontend`) y confirmar que pasa sin errores.

## Fase 6 — Validación final

- [ ] `npm run build` (en `ApprendeVr/frontend`) termina sin errores.
- [ ] Prueba manual completa en navegador: abrir AR-SYNC, rotar la brújula con ambas flechas
      (click y dwell), abrir cada sección apuntando, ajustar y guardar Configuración, ajustar y
      guardar Overlays, confirmar que los paneles estéreo reflejan los cambios.
- [ ] Confirmar que `TestOverlayAR2.jsx` ("AR-TEST") sigue funcionando sin cambios (no se tocó).
