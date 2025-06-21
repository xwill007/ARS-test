import React from 'react';

const TestHtmlOverlay = () => (
  <div
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 20,
      pointerEvents: 'none',
    }}
  >
    <iframe
      title="A-Frame Overlay"
      srcDoc={`
        <html>
          <head>
            <script src='https://aframe.io/releases/1.4.2/aframe.min.js'></script>
            <script src='https://cdn.jsdelivr.net/npm/aframe-orbit-controls@1.3.1/dist/aframe-orbit-controls.min.js'></script>
          </head>
          <body style='margin:0; background:transparent;'>
            <a-scene embedded vr-mode-ui="enabled: false" style="width: 100vw; height: 100vh; background: transparent;">
              <a-sphere position="0 2.5 -3" radius="0.3" color="orange"></a-sphere>
              <a-plane position="0 2.4 -3" rotation="-90 0 0" width="1" height="1" color="blue"></a-plane>
              <a-camera position="0 2.6 0" orbit-controls="target: 0 2.5 -3; enableDamping: true; dampingFactor: 0.125; rotateSpeed:0.3; minDistance:2; maxDistance:10; autoRotate:false; enablePan:false;" wasd-controls-enabled="false" look-controls-enabled="false"></a-camera>
            </a-scene>
          </body>
        </html>
      `}
      style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', pointerEvents: 'none' }}
      allow="xr-spatial-tracking; fullscreen"
    />
  </div>
);

export default TestHtmlOverlay;
