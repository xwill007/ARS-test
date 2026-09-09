---
name: aframe-elementos-3d
description: Reglas para crear elementos 3D interactivos en A-Frame (paneles, botones, filas clickeables) dentro de ARS-test — en particular, separar en profundidad cada capa apoyada sobre otra para evitar z-fighting y fallos de click. Usar cuando el usuario pida crear o ajustar un panel, botón, menú o cualquier UI 3D en A-Frame (mirror-fix, views/A-frame, o cualquier escena nueva).
---

# Elementos 3D interactivos en A-Frame (ARS-test)

Regla central: **ningún elemento clickeable/de texto va a la misma profundidad exacta que la
superficie sobre la que se apoya.** Dos planos coplanares (mismo `z` en el sistema de coordenadas
del padre) generan dos problemas reales, no solo cosméticos:

1. **Z-fighting visual**: el renderer no puede decidir de forma estable cuál de los dos planos
   dibujar encima, así que el color parpadea o se mezcla con el fondo (más notorio cuando la
   cámara se mueve o cambia el ángulo).
2. **Raycasting ambiguo**: el `raycaster` que maneja gaze/click (ver skill `overlay-ar-sync-aframe`
   y el mecanismo propio de hover/dwell/click del Requerimiento 012/013) puede intersectar
   cualquiera de los dos planos coplanares indistintamente — el click puede terminar
   "atravesando" el botón y activando lo que está debajo, o no activar nada.

Este proyecto ya tenía el hábito correcto en varios lugares (texto sobre un botón, triángulo de
norte sobre el círculo de la brújula) pero no en todos — ver el hallazgo real que originó este
skill en `ApprendeVr/Documentation/Requerimientos/2-Developing/013-menu-configuracion-brujula-3d-ar-sync/problems_solutions.md`:
los botones (steppers, filas de overlay, "Guardar") del panel 3D de `SyncConfigCompassMenu.jsx`
se agregaron al mismo `z` que el fondo del panel.

## La convención: un paso de profundidad por capa, sobre el eje perpendicular al plano

Usar un incremento pequeño y constante — **0.01 unidades de escena** — por cada capa que se apoya
visualmente sobre la anterior, acumulado hacia la cámara. **El eje sobre el que se aplica ese
offset no es siempre `z`** — es el eje LOCAL que queda perpendicular a la superficie del plano de
abajo (su normal), que puede terminar siendo `x`, `y` o `z` en el sistema del padre según cómo esté
rotado ese plano. Un `<a-plane>` sin rotar mira hacia `+z` (su normal es `z`), así que ahí el
offset va en `z`; el mismo plano rotado `-90` en `x` (para quedar tirado en el piso) pasa a mirar
hacia `+y`, así que ahí el offset va en `y` — mismo principio, distinto eje porque cambió la
orientación de la superficie, no la regla.

```
fondo del panel                offset perpendicular = 0
botón sobre el fondo           offset perpendicular = 0.01  (0.01 más cerca de la cámara)
texto sobre el botón           offset perpendicular = 0.01  (relativo al botón → 0.02 en total)
```

0.01 es intencionalmente casi imperceptible a simple vista (no se nota como un "salto" de
profundidad) pero es más que suficiente para que WebGL y el raycaster distingan las superficies
sin ambigüedad. No hace falta un valor mayor "por las dudas" — un offset más grande sí se empieza
a notar visualmente en ángulos rasantes. Antes de fijar el offset, identificar la rotación real del
plano de abajo y calcular hacia qué eje local apunta su normal — no asumir `z` por costumbre.

### Con elementos "de pie" (mirando a la cámara, sin rotación)

Si el elemento no tiene rotación (la orientación por defecto de `<a-plane>`/`<a-text>`, de frente
al usuario), su normal es `z`, así que el offset va directo en `z`:

```html
<a-plane width="0.85" height="0.32" color="#2e7d32" position="0 -0.95 0.01">
  <a-text value="Guardar" position="0 0 0.01"></a-text> <!-- 0.01 relativo al botón -->
</a-plane>
```

Ejemplo real ya en el repo: `createWidget`/`makeButton` en
`ApprendeVr/frontend/src/views/A-frame/vrPositionControl.js` (Requerimiento 010) coloca el grupo
`front` completo (flechas + texto) desplazado en `+Z` respecto al marcador, y cada texto de botón
un paso más adelante que su propio plano.

### Con elementos "planos contra el suelo" (`rotation="-90 0 0"`)

Cuando todo el grupo está rotado para quedar tirado en el piso o una mesa (como el círculo de la
brújula, sus flechas, y el panel de configuración de `SyncConfigCompassMenu.jsx`), esa rotación de
`-90°` en `x` hace que la normal del plano (antes `z`) pase a apuntar hacia `y` — por eso ahí el
"paso de profundidad" se escribe como un incremento en `y`, no en `z` (mismo principio de la
sección anterior, aplicado al eje que corresponde después de rotar):

```html
<a-entity rotation="-90 0 0"> <!-- todo el grupo, tirado en el piso -->
  <a-cylinder height="0.04" position="0 0 0"></a-cylinder>        <!-- superficie superior en y local = 0.02 -->
  <a-text position="0 0.03 0"></a-text>                            <!-- 0.01 por encima de esa superficie -->
</a-entity>
```

Esto es exactamente lo que ya hacen el triángulo de norte (`y="0.05"`, por encima de la cuña a
`y="0.02"`) y las etiquetas de cada porción (`y="0.03"`) en `SyncConfigCompassMenu.jsx` — es el
patrón a copiar para cualquier botón/fila nueva dentro de un grupo rotado así, calculando el paso
desde la superficie real (mitad de la altura del elemento de abajo), no un número arbitrario.

## Checklist al crear un panel o botón 3D nuevo

1. **Identificar la superficie de apoyo** (el plano/geometría más grande que sirve de fondo), su
   rotación, y hacia qué eje local queda apuntando su normal después de esa rotación.
2. **Cada hijo que se dibuja "sobre" esa superficie** (botón, fila clickeable, ícono, texto suelto)
   lleva `+0.01` en ESE eje (el de la normal — `x`, `y` o `z` según el caso) respecto a esa
   superficie — nunca el mismo valor en ese eje.
3. **Cada hijo DENTRO de ese botón** (su propio texto/ícono) repite el mismo paso de `0.01` sobre
   el mismo eje, *relativo al botón*, no al fondo original — así el offset se acumula capa por capa
   sin tener que recalcular la profundidad absoluta de cada nivel.
4. **Nunca asumir que "está encima en el DOM" alcanza.** El orden de los elementos en el HTML no
   define qué se ve encima en A-Frame/THREE.js cuando dos superficies son coplanares — solo la
   profundidad real evita el problema.
5. Si el elemento es `.clickable` (entra al `raycaster` del cursor, ver `overlay-ar-sync-aframe` y
   el mecanismo de dwell del Requerimiento 012/013), verificar además que el click funciona
   apuntando exactamente al centro de la superficie de abajo (donde más fácil se solapan) — no
   solo a un borde donde por casualidad no hay superposición.

## Dónde se aplica hoy en el repo

- `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/SyncConfigCompassMenu.jsx`:
  brújula (cuñas/etiquetas/triángulo de norte, patrón "y+0.01 sobre grupo rotado") y panel de
  configuración `#settings-panel` (steppers/filas de overlay/botones "Guardar", mismo patrón).
- `ApprendeVr/frontend/src/views/A-frame/vrPositionControl.js`: widgets de posición (patrón
  "z+0.01 sobre grupo de pie").

Cualquier escena A-Frame nueva de este proyecto (otro overlay de `mirror-fix`, un panel nuevo en
`views/A-frame`, etc.) que apile botones o texto sobre un fondo debe seguir esta misma convención.
