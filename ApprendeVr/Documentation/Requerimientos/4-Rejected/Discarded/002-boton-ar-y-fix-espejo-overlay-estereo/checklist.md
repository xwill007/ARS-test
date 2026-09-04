# Checklist de ejecución

### Fase 1 — Botón AR

- [x] 1.1 Agregar label de texto "AR" en `ARSFloatingButton.jsx`.
- [x] 1.2 Levantar el frontend (`npm run dev` o script equivalente) y abrir
      `src/views/ARs/index.html`; confirmar visualmente el label y que el click activa
      `ARStereoView` con cámara en ambos paneles.

> Nota de entorno: `vite.config.js` sirve el frontend por HTTPS con un certificado autofirmado
> (`ssl/cert.pem`), y la extensión de automatización de navegador no puede interactuar con la
> pantalla de advertencia de certificado de Chrome (no permite adjuntar el control remoto a esa
> página especial). Para poder probar el flujo en esta sesión se desactivó temporalmente HTTPS en
> `vite.config.js` (vía `VITE_TEST_NO_HTTPS=1`, con fallback al comportamiento normal si la
> variable no está seteada) y se sirvió por `http://localhost:3000` — Chrome trata
> `http://localhost` como contexto seguro, así que `getUserMedia` (cámara) igual funcionó. Ese
> cambio se revirtió por completo al terminar de probar; `vite.config.js` no tiene diff en git.
> Para validar manualmente (por ejemplo en un dispositivo real vía la IP de red), hay que aceptar
> el certificado autofirmado una vez en el navegador del dispositivo.

### Fase 2 — Fix del selector de espejo

- [x] 2.1 Agregar `data-overlay="true"` en `ARPanel.jsx` línea 227 (línea 228 tras el cambio, tag
      quedó en múltiples líneas).
- [x] 2.2 Activar `optimizeStereo` + `mirrorRightPanel` desde el panel ⚙️ de `ARSConfig`.
- [x] 2.3 Probado con el overlay HTML/A-Frame por defecto (`vrConeOverlay`, vía `iframe srcDoc`).
      El selector corrige el bug de 2.3-antecedentes (`data-overlay` pasa de 0 a 1 coincidencias),
      pero por sí solo no bastaba para reflejar el overlay — ver Fase 2.5/2.6.
- [x] 2.4 **No se pudo probar overlays R3F vía UI.** El dropdown "Overlays" del panel ⚙️
      (`ARSConfig`) no respondió de forma confiable a los clicks de la automatización de navegador
      (abría/cerraba sin mostrar las opciones de forma estable) — no se logró cambiar la selección
      a un overlay `r3f` (`simpleText`, `rotatingCube`, etc.) durante esta sesión. Se decidió no
      perseguir el fix para overlays R3F en este requerimiento (ver Fase 3).
- [x] 2.5 A pedido del usuario, se armó un arnés de prueba temporal (botones "AR1"/"AR2"/"AR3" en
      `appArs.jsx`, componentes en `ARScomponents/ARStest/mirror-fix/`, eliminados al terminar)
      para probar en paralelo, sin tocar el flujo real, los Intentos 3, 4 y 5 del checklist de la
      sección 4.3. Resultado de cada uno documentado ahí: Intento 3 (canvas manual) y 5 (A-Frame
      1.6.0) fallaron, Intento 4 (captura sincrónica en el loop de render) funcionó — confirmado
      con mediciones de píxeles y capturas de pantalla.
- [x] 2.6 Aplicado el Intento 4 al overlay real `VRConeOverlay.jsx` y a `VRLocalVideoOverlay.jsx`
      (mismo patrón). Probado end-to-end con el botón "AR" real (no el de prueba): overlay
      reflejado correctamente en el panel derecho (19751/182400 píxeles del color del texto,
      confirmado visualmente). Arnés de prueba eliminado tras confirmar el resultado.

### Fase 3 — Overlays R3F (fuera de alcance de este requerimiento)

- [x] 3.1 Se revirtió el `gl={{ preserveDrawingBuffer: true }}` agregado en el Intento 2 a los
      `<Canvas>` de `ARPanel.jsx` — no resuelve nada por sí solo (mismo problema de propagación
      que en A-Frame, confirmado para el caso A-Frame; no se confirmó para R3F pero no hay razón
      para esperar que sea distinto dado que el mecanismo de fondo es el mismo WebGL context).
- [ ] 3.2 Adaptar el Intento 4 (captura sincrónica) al render loop de R3F (`onCreated={({gl}) =>`)
      — no implementado en este requerimiento, queda como trabajo de seguimiento explícito (ver
      sección 3 "No incluido" y 4.4).

### Fase 4 — Limpieza de código muerto y validación cruzada

- [x] 4.1 Se eliminó la rama inalcanzable de `OptimizedOverlayWrapper.jsx` (antiguas líneas
      16-21), dejando un comentario explicando por qué ese caso (`isPrimaryPanel=false` +
      `mirrorRightPanel=true`) nunca ocurre — `ARStereoView.jsx` ya sustituye `<ARPanel>` por un
      `<canvas>` espejo en ese caso, nunca llega a montar este wrapper con esa combinación.
- [x] 4.2 Con `optimizeStereo`/`mirrorRightPanel` desactivados, se confirmó que ambos paneles
      siguen renderizando overlay independiente (cámara + `vrConeOverlay`) igual que antes del
      cambio — no hubo regresión. Confirmado dos veces (antes y después de aplicar el Intento 4).
- [x] 4.3 Criterios de la sección 6 cumplidos, salvo el de overlays R3F (fuera de alcance, ver
      Fase 3) — ese ítem queda sin marcar intencionalmente.
- [x] 4.4 `npx vite build` corre sin errores con todos los cambios aplicados (sanity check de
      sintaxis tras el fix de un backtick sin escapar dentro del `srcDoc` de `VRConeOverlay.jsx`
      que rompía el parseo de Babel — corregido en la misma sesión).
