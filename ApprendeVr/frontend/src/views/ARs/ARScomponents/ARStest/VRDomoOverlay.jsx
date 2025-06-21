import React from 'react';

const VRDomoOverlay = () => (
  <iframe
    title="VRDomo Overlay"
    srcDoc={`
      <html>
        <head>
          <script src='https://aframe.io/releases/1.4.2/aframe.min.js'></script>
        </head>
        <body style='margin:0; background:transparent;'>
          <a-scene embedded vr-mode-ui="enabled: false" style="width: 100vw; height: 100vh; background: transparent;">
            <a-sphere radius="2" segments-width="32" segments-height="16" color="#6699CC" opacity="0.5" side="double" position="0 2 -5"></a-sphere>
            <a-camera position="0 2 5"></a-camera>
          </a-scene>
        </body>
      </html>
    `}
    style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', pointerEvents: 'none' }}
    allow="xr-spatial-tracking; fullscreen"
  />
);

export default VRDomoOverlay;
