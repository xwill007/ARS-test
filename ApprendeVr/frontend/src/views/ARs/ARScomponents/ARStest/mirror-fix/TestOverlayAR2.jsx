import React from 'react';

/**
 * TestOverlayAR2 — Requerimiento 002, Intento 4 del checklist de la sección 4.3
 * (Documentation/Requerimientos/2-Developing/002-boton-ar-y-fix-espejo-overlay-estereo.md).
 * Overlay A-Frame mínimo (caja + texto) que se engancha al loop de render de three.js dentro del
 * propio iframe: cada vez que A-Frame llama a renderer.render(), copiamos sincrónicamente el
 * canvas WebGL a un <canvas> 2D oculto (#ars-frame-capture) en el mismo tick, antes de que el
 * navegador pueda limpiar el buffer. No depende de preserveDrawingBuffer (confirmado que A-Frame
 * no lo propaga al contexto WebGL real, ver Intento 2 del requerimiento).
 * El <canvas id="ars-frame-capture"> va ANTES que <a-scene> en el DOM a propósito: el mirror de
 * ARStereoView.jsx busca `iframe.contentDocument.querySelector('canvas')` (el primero en orden de
 * documento), así que debe ser el capturado, no el <canvas class="a-canvas"> real de A-Frame.
 *
 * Este es el único intento de los tres probados (AR1/AR2/AR3) que funcionó — confirmado en
 * navegador con mediciones de píxeles y capturas de pantalla (ver el requerimiento).
 *
 * Componente de prueba aislado: NO se importa ni se usa desde ningún archivo de producción
 * (ARSExperience, ARStereoView, appArs, etc. quedan intactos). Solo lo monta el botón de prueba
 * temporal — ver ARTestMirrorButton.jsx en esta misma carpeta.
 */
const srcDoc = `
    <html>
      <head>
        <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
      </head>
      <body style="margin:0; background:transparent;">
        <canvas id="ars-frame-capture"></canvas>
        <a-scene embedded vr-mode-ui="enabled: false" style="width: 100vw; height: 100vh; background: transparent;">
          <a-box position="0 1.6 -3" rotation="0 45 0" color="#EF2D5E" animation="property: rotation; to: 0 405 0; loop: true; dur: 4000"></a-box>
          <a-text value="AR-TEST: espejo overlay" position="-1.5 2.6 -3" color="#FFFFFF" width="4"></a-text>
          <a-camera position="0 1.8 0"></a-camera>
        </a-scene>
        <script>
          var scene = document.querySelector('a-scene');
          function setupFrameCapture() {
            var renderer = scene.renderer;
            var captureCanvas = document.getElementById('ars-frame-capture');
            var captureCtx = captureCanvas.getContext('2d');
            var originalRender = renderer.render.bind(renderer);
            renderer.render = function () {
              originalRender.apply(renderer, arguments);
              try {
                var w = renderer.domElement.width;
                var h = renderer.domElement.height;
                // Resincronizar el tamaño en cada frame: el canvas real puede cambiar de tamaño
                // (rotación del dispositivo, resize del panel) y si el de captura queda
                // desactualizado, drawImage estira/distorsiona la imagen.
                if (captureCanvas.width !== w || captureCanvas.height !== h) {
                  captureCanvas.width = w;
                  captureCanvas.height = h;
                }
                // El contexto WebGL tiene alpha:true (fondo transparente) — sin limpiar antes de
                // cada dibujo, los frames nuevos se componen sobre los viejos en vez de
                // reemplazarlos, dando un efecto de "réplica múltiple" al mover la cámara.
                captureCtx.clearRect(0, 0, w, h);
                captureCtx.drawImage(renderer.domElement, 0, 0, w, h);
              } catch (e) {}
            };
          }
          // Timing: si el navegador ya tiene A-Frame en caché, el evento 'loaded' puede disparar
          // antes de que este script llegue a engancharse — comprobar hasLoaded en vez de confiar
          // solo en el evento.
          if (scene.hasLoaded) {
            setupFrameCapture();
          } else {
            scene.addEventListener('loaded', setupFrameCapture);
          }
        </script>
      </body>
    </html>
  `;

const TestOverlayAR2 = () => (
  <iframe
    title="Test Overlay AR2 (espejo)"
    srcDoc={srcDoc}
    style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', pointerEvents: 'auto' }}
  />
);

export default TestOverlayAR2;
