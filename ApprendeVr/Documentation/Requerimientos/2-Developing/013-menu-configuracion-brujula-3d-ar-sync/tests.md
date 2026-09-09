# Estrategia de testing — Requerimiento 013

`mirror-fix/` es terreno de pruebas aislado sin suite de tests automatizados propia (mismo
criterio que los Requerimientos 002/011/012 — ver Requerimiento 008, aparte, para la estrategia
general de testing del frontend). La verificación de este requerimiento es manual, en navegador,
apoyada en `npm run build`/`npm run check:i18n` como red mínima automatizada.

## Casos de prueba manual

| # | Caso | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|
| 1 | Brújula visible al abrir AR-SYNC | Abrir `artest-mirror.html` → AR-SYNC | Círculo con triángulo de norte y 2 porciones ("Configuration", "Overlays") visible en el suelo de ambos paneles; sin botón ☰ ni panel fijo en la esquina | **Confirmado** (Claude en Chrome, `dist/` servido por `http.server` — ver nota de entorno abajo) |
| 2 | Rotar con flecha (click directo) | Click en cada flecha, una y otra vez | El grupo de porciones rota `360°/N` grados por click, en el sentido correspondiente a cada flecha | **No confirmado con interacción real** — el entorno de automatización usado congela el loop de render de A-Frame (`document.hidden=true` en los iframes). Se confirmó que el cálculo/aplicación de la rotación es correcto forzando `scene.tick()` manualmente (las cuñas intercambiaron de lado). Pendiente de confirmación manual en navegador/dispositivo real — ver `problems_solutions.md` |
| 3 | Rotar con flecha (dwell/gaze) | Apuntar sostenido a una flecha sin clickear, esperar el fuse | Mismo efecto que el click directo, con el feedback visual rojo/achicado del reticle durante el dwell | Pendiente (mismo motivo que el caso 2) |
| 4 | Seleccionar porción por dwell | Apuntar sostenido a una porción (Configuración u Overlays) | Se despliega al frente del usuario (centro de pantalla) el panel de esa sección; deja de mostrarse al dejar de apuntar | **Confirmado** que se despliega (el panel de "Configuration" se abrió solo tras el tiempo de dwell). El cierre automático al dejar de apuntar no se pudo ejercitar en este entorno — se confirmó en cambio que cerrarlo con el botón ✕ funciona y no se reabre solo |
| 5 | Seleccionar porción por click directo | Click directo en una porción | Mismo resultado que el caso 4, sin esperar el dwell | Pendiente — mismo motivo que el caso 2 (se intentó simular un click real vía `MouseEvent` proyectado sobre el canvas, sin resultado concluyente en este entorno) |
| 6 | Panel "Configuración" funcional | Con el panel abierto, mover los sliders de separación/ancho/alto | Los paneles estéreo reflejan el cambio en vivo, igual que con el menú 2D anterior | Parcial — los sliders responden visualmente (arrastre confirmado), no se verificó el efecto en el tamaño real de los paneles estéreo |
| 7 | Guardar "Configuración" | Ajustar sliders, pulsar guardar, recargar la vista | El botón se pone gris tras guardar con éxito; al recargar, los valores guardados se recuperan (`getUserSetting`) | Pendiente — el navegador de prueba no tenía sesión iniciada (se confirmó que el menú muestra correctamente "No session in this browser" en ese caso) |
| 8 | Panel "Overlays" funcional | Con el panel abierto, togglear checkboxes de overlays | Los paneles estéreo agregan/quitan el overlay correspondiente en vivo | Parcial — se confirmó que la pestaña muestra las 4 opciones con su estado correcto; no se probó togglear y ver el efecto en los paneles |
| 9 | Guardar "Overlays" | Togglear selección, pulsar guardar, recargar la vista | Mismo criterio de feedback y persistencia que el caso 7, para la selección de overlays | Pendiente — mismo motivo que el caso 7 |
| 10 | Consistencia entre paneles estéreo | Repetir los casos 1-9 comparando panel izquierdo y derecho | Misma brújula, misma interacción y mismo resultado en ambos paneles | **Confirmado** para los casos ya confirmados (1 y 4): ambos paneles mostraron la misma brújula y el mismo panel centrado |
| 11 | AR-TEST no afectado | Abrir "AR-TEST" desde `artest-mirror.html` | Sigue funcionando sin cambios, sin ningún rastro de la brújula (no aplica ahí) | Pendiente (no se abrió AR-TEST en esta pasada; no se tocó ningún archivo de esa vista, ver `requerimiento.md`) |
| 12 | Build e i18n | `npm run build` y `npm run check:i18n` en `ApprendeVr/frontend` | Ambos terminan sin errores | **Confirmado** — ambos pasan limpio (ver nota sobre `vite.config.js` en `problems_solutions.md`) |

**Nota de entorno:** `vite dev` sirve por HTTPS con certificado autofirmado, que el navegador
controlado por la extensión Claude en Chrome bloquea (no puede pasar el interstitial de
seguridad). Para poder probar visualmente se sirvió `dist/` (compilado con `artest-mirror.html`
agregado a `vite.config.js`, ver `problems_solutions.md`) con un `http.server` plano en HTTP. Ese
mismo entorno reporta `document.hidden=true` en los iframes, congelando el loop de render de
A-Frame — ver el hallazgo correspondiente en `problems_solutions.md` para el detalle de qué se
pudo y no se pudo confirmar por esa causa.

## Fuera de esta pasada

- No se define suite automatizada (unitaria/integración/e2e) para este componente — igual
  criterio que el resto de `mirror-fix` hasta que el Requerimiento 008 defina la estrategia
  general.
- No se prueba con magnetómetro/orientación geomagnética real — fuera de alcance (ver
  `requerimiento.md`, sección "No incluido").
