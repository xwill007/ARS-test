// Convierte la posición del mouse a coordenadas NDC (-1..1) para el raycasting manual que usan
// los paneles portados (VRKaraokeAf, VRNewSongAf, VREvaluacionAf).
//
// La cámara de esta vista usa look-controls con pointerLockEnabled: true (ver VRCameraAf.js /
// VRUserAf.js), así que el primer click sobre el canvas activa el Pointer Lock del navegador.
// Una vez bloqueado, MouseEvent.clientX/clientY dejan de reflejar la posición real del cursor (el
// navegador lo oculta y solo reporta deltas vía movementX/movementY) — computar la NDC a partir de
// clientX/clientY en ese estado apunta siempre al mismo punto congelado de la pantalla, así que
// los clicks dejan de acertar sobre los botones justo después de ese primer click. Con el puntero
// bloqueado, en cambio, el usuario apunta girando la cámara (como una mira centrada en pantalla),
// así que se usa el centro de la pantalla (0, 0) — equivalente a disparar el rayo en la dirección
// exacta hacia la que mira la cámara.
export function getPointerNDC(canvas, clientX, clientY) {
  if (document.pointerLockElement === canvas) {
    return { x: 0, y: 0 };
  }
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((clientY - rect.top) / rect.height) * 2 + 1;
  return { x, y };
}
