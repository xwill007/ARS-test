# Problemas y soluciones — Requerimiento 010

## 1. Rediseño: control global con selector → un marcador por elemento

**Problema:** la primera versión de `vrPositionControl.js` era un único ícono 📍 fijo en una
esquina de la pantalla (overlay HTML), con un `<select>` para elegir a cuál de los tres elementos
(video/karaoke/agregar canción) afectaba el d-pad. El usuario reportó "no veo el ícono para abrir
el elemento que permite ajustar la posición en cada elemento" y aclaró después explícitamente:
"este se debe agregar es a cada elemento... no en la esquina superior izquierda de toda la vista".

**Causa:** decisión de diseño equivocada — un control compartido para los tres elementos no es lo
que se pidió ("la misma funcionalidad... para el formulario de login", que sí está pegada a ESE
elemento específico, no a la pantalla entera).

**Solución:** se reescribió `vrPositionControl.js` para que cada elemento tenga su propio marcador
(un `a-circle` rojo) y su propio d-pad, ambos como hijos 3D de la entidad de ese elemento — al
moverse el elemento, su marcador y d-pad se mueven con él (posición local), igual que
`UbicacionControl` está pegado al formulario de login. Se comparte un solo listener de
`pointerdown` (raycast manual) entre los tres widgets para no triplicar código de raycasting.

**Estado:** resuelto y verificado en navegador (los tres marcadores abren su propio d-pad
independiente).

## 2. Guardado explícito en vez de automático en cada movimiento

**Pedido del usuario:** "agrega un boton guardar(save) para registrar el ajuste en db en ese
momento" — en vez de que cada click del d-pad dispare un `PUT` a la API.

**Solución:** cada d-pad ahora incluye un botón GUARDAR. Mover con las flechas o +/- solo
actualiza la posición en memoria/pantalla (`el.setAttribute('position', ...)`); el `PUT
/api/user-settings/aframe-view` con el JSON completo (`{video,karaoke,newSong}`) se dispara recién
al pulsar GUARDAR. El botón da feedback visual (flash verde breve) al guardar.

**Estado:** resuelto y verificado (`GET` después de mover sin guardar sigue devolviendo el valor
previo; después de pulsar GUARDAR, devuelve el nuevo).

## 3. Los marcadores no quedaban en la esquina superior izquierda de cada panel

**Fecha:** tras la corrección del punto 1, el usuario señaló: "no lo veo en el panel de video con
su lista y en el formulario de nueva canción está en la esquina superior derecha" — pedía que el
marcador quedara siempre en la esquina superior **izquierda** de cada panel (misma convención que
`UbicacionControl`, que usa `corner="top-left"`).

**Causa:** los offsets elegidos en la primera versión de los widgets no seguían una convención de
esquina consistente:
- `newSong`: offset `[1.9, 2.6, 0.05]` — positivo en X, es decir, esquina superior **derecha** del
  panel (ancho 3.2, alto 5.15), no la izquierda pedida.
- `karaoke`: offset `[0, 7.4, -3]` — centrado en X (arriba del centro del video, no de una
  esquina), fácil de perder contra el fondo negro del video sin nada más color alrededor.

**Solución:** se recalcularon los offsets con la fórmula `(-width/2, height/2 + 0.3, z)` —
esquina superior izquierda, un poco por encima del borde superior — para los tres elementos:
- `video` (16×9, centrado en 0,0,0 local): `[-8, 4.8, 0]` (ya estaba correcto).
- `karaoke` (se ancla a su video interno, 15×9 centrado en `0 2.5 -3` local, ver
  `videoPosition`/`videoWidth`/`videoHeight` del componente `vr-karaoke-af` en `index.html`):
  `[-7.5, 7.3, -3]`. `karaoke` es un grupo compuesto (video + lista de canciones, separados ~12
  unidades en X) — se usa el video como referencia por ser su elemento visualmente principal.
- `newSong` (3.2×5.15, centrado en 0,0,0 local): `[-1.6, 2.875, 0.05]`.

**Estado:** resuelto y verificado en navegador: los tres marcadores aparecen en la esquina
superior izquierda de su panel correspondiente.

## 4. Confusión inicial: "no veo la tabla `user_settings`" en un cliente de BD externo

**Problema:** el usuario no encontraba la tabla `user_settings` en `english_vr` desde su cliente
de base de datos (DBeaver), a pesar de que la API ya la usaba con normalidad.

**Causa raíz (verificada):** esta Mac tiene **dos** servidores MySQL corriendo a la vez —
uno local vía Homebrew (`mysqld`, puerto **3306**, sin base `english_vr`) y el del contenedor
Docker del proyecto (puerto **3307**, con `english_vr` y `user_settings`). Si la conexión de
DBeaver apunta al 3306 (el puerto por defecto de MySQL), busca en el servidor equivocado. Una vez
confirmado que la conexión apuntaba al 3307 correcto, el problema fue que DBeaver cachea el árbol
de esquemas por sesión y no detecta solo una tabla creada fuera de esa sesión — hacía falta un
refresh manual (F5 / "Invalidate-Reconnect") sobre la conexión.

**Estado:** resuelto (confirmado por el usuario tras sincronizar/refrescar la conexión). Se deja
documentado para no repetir el diagnóstico si vuelve a pasar con otra tabla nueva en este entorno.

> Recordatorio: si un item de `checklist.md` o un criterio de aceptación ya marcado `[x]` resulta
> no estar realmente resuelto, hay que corregir la marca y registrar acá el hallazgo como
> **hallazgo tardío**, sin esperar a que se pida.
