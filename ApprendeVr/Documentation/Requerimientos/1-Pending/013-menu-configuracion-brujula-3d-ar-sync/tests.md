# Estrategia de testing — Requerimiento 013

`mirror-fix/` es terreno de pruebas aislado sin suite de tests automatizados propia (mismo
criterio que los Requerimientos 002/011/012 — ver Requerimiento 008, aparte, para la estrategia
general de testing del frontend). La verificación de este requerimiento es manual, en navegador,
apoyada en `npm run build`/`npm run check:i18n` como red mínima automatizada.

## Casos de prueba manual

| # | Caso | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|
| 1 | Brújula visible al abrir AR-SYNC | Abrir `artest-mirror.html` → AR-SYNC | Círculo con triángulo de norte y 2 porciones ("CONFIGURACIÓN", "OVERLAYS") visible en el suelo de ambos paneles; sin botón ☰ ni panel fijo en la esquina | Pendiente |
| 2 | Rotar con flecha (click directo) | Click en cada flecha, una y otra vez | El grupo de porciones rota `360°/N` grados por click, en el sentido correspondiente a cada flecha | Pendiente |
| 3 | Rotar con flecha (dwell/gaze) | Apuntar sostenido a una flecha sin clickear, esperar el fuse | Mismo efecto que el click directo, con el feedback visual rojo/achicado del reticle durante el dwell | Pendiente |
| 4 | Seleccionar porción por dwell | Apuntar sostenido a una porción (Configuración u Overlays) | Se despliega al frente del usuario (centro de pantalla) el panel de esa sección; deja de mostrarse al dejar de apuntar | Pendiente |
| 5 | Seleccionar porción por click directo | Click directo en una porción | Mismo resultado que el caso 4, sin esperar el dwell | Pendiente |
| 6 | Panel "Configuración" funcional | Con el panel abierto, mover los sliders de separación/ancho/alto | Los paneles estéreo reflejan el cambio en vivo, igual que con el menú 2D anterior | Pendiente |
| 7 | Guardar "Configuración" | Ajustar sliders, pulsar guardar, recargar la vista | El botón se pone gris tras guardar con éxito; al recargar, los valores guardados se recuperan (`getUserSetting`) | Pendiente |
| 8 | Panel "Overlays" funcional | Con el panel abierto, togglear checkboxes de overlays | Los paneles estéreo agregan/quitan el overlay correspondiente en vivo | Pendiente |
| 9 | Guardar "Overlays" | Togglear selección, pulsar guardar, recargar la vista | Mismo criterio de feedback y persistencia que el caso 7, para la selección de overlays | Pendiente |
| 10 | Consistencia entre paneles estéreo | Repetir los casos 1-9 comparando panel izquierdo y derecho | Misma brújula, misma interacción y mismo resultado en ambos paneles | Pendiente |
| 11 | AR-TEST no afectado | Abrir "AR-TEST" desde `artest-mirror.html` | Sigue funcionando sin cambios, sin ningún rastro de la brújula (no aplica ahí) | Pendiente |
| 12 | Build e i18n | `npm run build` y `npm run check:i18n` en `ApprendeVr/frontend` | Ambos terminan sin errores | Pendiente |

## Fuera de esta pasada

- No se define suite automatizada (unitaria/integración/e2e) para este componente — igual
  criterio que el resto de `mirror-fix` hasta que el Requerimiento 008 defina la estrategia
  general.
- No se prueba con magnetómetro/orientación geomagnética real — fuera de alcance (ver
  `requerimiento.md`, sección "No incluido").
