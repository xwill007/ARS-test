// Reproductor de YouTube compartido de esta vista: un único panel 2D flotante (DOM normal, no
// A-Frame) con un iframe embebido, reutilizado por cualquier componente que necesite reproducir un
// video de YouTube — hoy VRNewSongAf ("PREVIEW ON YOUTUBE") y VRKaraokeAf (canciones
// `source: 'youtube'`, Requerimiento 014 ampliación). Antes cada uno tenía su propia copia de este
// panel; se unifica acá con estado a nivel de módulo para que solo exista UNO a la vez sin
// importar quién lo abrió — abrir uno nuevo cierra automáticamente el anterior.
//
// Un iframe cross-origin de YouTube no se puede pintar como `<a-video>` (no se puede leer como
// textura WebGL — restricción documentada en el Requerimiento 015), así que este panel vive fuera
// de la escena A-Frame, superpuesto al canvas.
let overlayEl = null;
let trackingRafId = null;

// `anchor` es opcional: { object3D, sceneEl }. Si se pasa, el panel seguirá ese objeto 3D en
// pantalla cada frame (mismo truco de "billboard" que ya usaba VRNewSongAf: proyectar un punto
// fijo delante del objeto con `Vector3.project(camera)`), para que responda al giroscopio/
// mouse-drag como si estuviera anclado ahí en el espacio 3D. Sin `anchor`, el panel queda fijo
// centrado en pantalla.
export function openYoutubePlayer(videoId, anchor) {
  closeYoutubePlayer();

  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '50%';
  overlay.style.left = '50%';
  overlay.style.transform = 'translate(-50%, -50%)';
  overlay.style.width = '480px';
  overlay.style.maxWidth = '90vw';
  overlay.style.zIndex = '99999';
  overlay.style.background = '#000000';
  overlay.style.border = '2px solid #454545';
  overlay.style.borderRadius = '6px';
  overlay.style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.6)';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'X CERRAR';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '-16px';
  closeBtn.style.right = '-16px';
  closeBtn.style.background = '#772222';
  closeBtn.style.color = '#ffffff';
  closeBtn.style.border = 'none';
  closeBtn.style.borderRadius = '4px';
  closeBtn.style.padding = '4px 8px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontSize = '12px';
  closeBtn.addEventListener('click', () => closeYoutubePlayer());
  overlay.appendChild(closeBtn);

  const iframe = document.createElement('iframe');
  iframe.src = 'https://www.youtube.com/embed/' + encodeURIComponent(videoId) + '?autoplay=1';
  iframe.style.display = 'block';
  iframe.style.width = '100%';
  iframe.style.aspectRatio = '16 / 9';
  iframe.style.border = 'none';
  iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
  iframe.setAttribute('allowfullscreen', '');
  overlay.appendChild(iframe);

  document.body.appendChild(overlay);
  overlayEl = overlay;

  if (anchor && anchor.object3D && anchor.sceneEl) {
    startTracking(anchor);
  }

  return overlay;
}

export function closeYoutubePlayer() {
  if (trackingRafId) {
    cancelAnimationFrame(trackingRafId);
    trackingRafId = null;
  }
  if (overlayEl && overlayEl.parentNode) {
    overlayEl.parentNode.removeChild(overlayEl);
  }
  overlayEl = null;
}

export function isYoutubePlayerOpen() {
  return !!overlayEl;
}

// Reubica el panel en cada frame proyectando un punto delante de `anchor.object3D` a coordenadas
// de pantalla. Ver el comentario grande de `openYoutubePlayer`.
function startTracking(anchor) {
  const THREE = AFRAME.THREE;
  const worldPos = new THREE.Vector3();
  const update = () => {
    if (!overlayEl) return;
    const sceneEl = anchor.sceneEl;
    const camera = sceneEl && sceneEl.camera;
    const canvas = sceneEl && sceneEl.canvas;
    if (camera && canvas && anchor.object3D) {
      // `updateMatrixWorld(true)` desde la raíz de la escena: sin esto, `localToWorld`/`project()`
      // pueden leer una matriz vieja (un tick de A-Frame detrás) si este `requestAnimationFrame`
      // corre antes que el propio tick interno de la escena en el mismo frame — hallazgo real,
      // verificado en vivo: sin este refresh explícito el punto proyectado quedaba con
      // coordenadas de un frame anterior.
      sceneEl.object3D.updateMatrixWorld(true);
      worldPos.set(0, 0, 0.3);
      anchor.object3D.localToWorld(worldPos);
      const projected = worldPos.project(camera);
      const rect = canvas.getBoundingClientRect();
      const behind = projected.z > 1;
      overlayEl.style.display = behind ? 'none' : 'block';
      if (!behind) {
        overlayEl.style.left = (rect.left + (projected.x * 0.5 + 0.5) * rect.width) + 'px';
        overlayEl.style.top = (rect.top + (-projected.y * 0.5 + 0.5) * rect.height) + 'px';
      }
    }
    trackingRafId = requestAnimationFrame(update);
  };
  update();
}
