// Antirebote para activaciones de botones 3D clickeables (ver skill `aframe-elementos-3d`).
//
// Problema real: un solo click físico dispara VARIOS eventos sobre el mismo botón a la vez —
// 'mousedown' + 'click', o el raycast manual (handlePointer) + el 'click' nativo, o 'touchstart'
// + 'click' — y como todos llaman al mismo callback, la acción se ejecuta dos veces seguidas
// (doble selección instantánea). No alcanza con filtrar por `evt.defaultPrevented`: los eventos
// vienen de pipelines distintos y no comparten ese flag.
//
// Solución: un wrapper por botón que ignora cualquier invocación dentro de
// CLICK_DEBOUNCE_MS desde la última que dejó pasar. Se crea UN wrapper POR BOTÓN (no uno
// compartido) para que dos botones distintos sigan pudiendo clickearse en rápida sucesión — el
// antirebote solo bloquea el doble disparo sobre el MISMO botón.
export const CLICK_DEBOUNCE_MS = 400;

// `fn` es el callback real del botón (sin argumentos o con el `evt`/`intersection` que reciba).
// Devuelve una función wrapper que se usa en lugar de `fn` en los `addEventListener`.
export function debounceActivation(fn) {
  let last = 0;
  return function (arg) {
    const now = Date.now();
    if (now - last < CLICK_DEBOUNCE_MS) return;
    last = now;
    return fn.call(this, arg);
  };
}
