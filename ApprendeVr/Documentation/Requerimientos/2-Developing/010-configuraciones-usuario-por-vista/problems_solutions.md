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

## 5. `#video-container` nunca existió: el widget "video" quedaba fuera de la config guardada y el `PUT` fallaba con 400

**Problema:** el usuario reportó "al dar al boton de guardar y refrezcar no queda donde se dejo
guardado" y, más tarde, un error concreto en consola: `PUT /api/user-settings/aframe-view 400
(Bad Request)`.

**Causa raíz:** `ELEMENTS` en `vrPositionControl.js` incluía una entrada
`{ key: 'video', selector: '#video-container', ... }`, pero ese id nunca existió en `index.html`
— el video del karaoke vive DENTRO del propio panel `vr-karaoke-af` (ver `videoPosition` en su
schema), no como una entidad independiente. `initPositionControl()` filtra los `targets` a los que
sí resuelven en el DOM (`document.querySelector`), así que el widget de "video" nunca llegaba a
crearse — pero el backend (`isValidAframeViewConfig`) seguía exigiendo las TRES claves (`video`,
`karaoke`, `newSong`). Como la config enviada solo tenía `karaoke`/`newSong`, la validación fallaba
y el `PUT` devolvía 400 en cada intento de GUARDAR, así que ningún ajuste de estos dos elementos se
persistía jamás — de ahí que tras recargar la página siempre volvieran a su posición hardcodeada.

**Hallazgo tardío:** esto invalida el `[x]` de `checklist.md` Fase 5 ("mover el video (+1 en Y con
el d-pad), recargar y confirmar que aparece en la posición ajustada") — esa verificación no pudo
haber probado lo que dice, porque el widget de "video" nunca se creó. Se corrigió la marca en
`checklist.md`.

**Solución:** se eliminó la entrada `video` de `ELEMENTS` (no hay elemento de video independiente
para posicionar) y se actualizó `AFRAME_VIEW_ELEMENTS` en el backend (`user-settings.util.ts`) a
`['karaoke', 'newSong']`, alineando la validación con lo que realmente existe en el DOM.

**Estado:** resuelto y verificado con `PUT`/`GET` directos contra el backend real: el guardado
ahora devuelve 200 y el valor persiste tras recargar.

## 6. El marcador 📍 movía el elemento en vez de abrir el d-pad

**Problema:** el usuario reportó "al dar al icono no despliega el menu para mover sino que mueve
hacia arriba el elemento".

**Causa raíz:** al agrandar las flechas del d-pad para facilitar el click, la flecha "^" (offset
local `y=0.48` dentro del d-pad) quedaba a solo 0.02 unidades del marcador — el d-pad estaba
desplazado apenas `oy - 0.5` respecto a él, prácticamente superpuestos. El raycaster manual
compartido (`setupSharedRaycast`) activa el PRIMER objeto intersectado, así que terminaba
activando la flecha "^" (mover hacia arriba) en vez del marcador (abrir/cerrar el d-pad).

**Solución:** se aumentó el desplazamiento del d-pad respecto al marcador de `oy - 0.5` a
`oy - 0.9`, separando lo suficiente ambos elementos para que el raycaster los distinga.

**Estado:** resuelto y verificado en navegador (clickear el marcador abre/cierra el d-pad
correctamente, sin mover el elemento).

## 7. Panel de evaluación: fórmulas de posición inconsistentes entre `init()` y `update()`

**Problema:** el usuario pidió "bajalo un poco mas... para visualizar mejor el icono rojo de
cerrar" (el botón "X", arriba a la derecha del panel).

**Causa raíz:** `init()` ajustaba `data.position` sumando `y+1` y restando `z-1`, pero AFRAME llama
a `update()` inmediatamente después de `init()` en el primer attach — y `update()` recalculaba la
posición desde cero a partir de `data.position` (sin el `+1`), restando `z-2`, pisando por completo
el ajuste de `init()` sin usarlo. El resultado real (`y` sin ajustar, `z-2`) dejaba el panel
spawneando a la altura de los ojos de la cámara, con el botón "X" (arriba a la derecha, en
`height/2 - 0.18` local) cerca del borde superior del campo de visión.

**Solución:** se eliminó el ajuste duplicado de `init()` (queda solo como valor de partida, ya que
`update()` lo pisa de inmediato) y se unificó la fórmula en `update()`: `y - 0.3, z - 2`, bajando el
panel lo suficiente para que el botón "X" quede cómodamente visible.

**Estado:** resuelto y verificado visualmente en navegador.

## 8. Escala del widget duplicada + flechas e input a la misma distancia de la cámara

**Pedido del usuario:** "aumenta la escala lo quiero el doble de grande para mejor control" y, en
un pedido relacionado, "veo que tiraste hacia adelante el input pero no las flechas ajusta a la
misma distancia".

**Solución:** se aplicó `scale: 2 2 2` al marcador y al d-pad completo (flechas, coordenadas y
ancla del input escalan juntos, incluida la separación entre ellos). Además, se creó un grupo
`front` dentro del d-pad que agrupa TODO el contenido interactivo (coordenadas, flechas, ancla del
input) desplazado como una única unidad hacia la cámara (+Z) — antes solo el ancla del input tenía
ese desplazamiento, dejando las flechas en un plano distinto y más lejano, separadas visualmente
del input en vez de formar un solo conjunto.

**Estado:** resuelto y verificado en navegador.

> Recordatorio: si un item de `checklist.md` o un criterio de aceptación ya marcado `[x]` resulta
> no estar realmente resuelto, hay que corregir la marca y registrar acá el hallazgo como
> **hallazgo tardío**, sin esperar a que se pida.
