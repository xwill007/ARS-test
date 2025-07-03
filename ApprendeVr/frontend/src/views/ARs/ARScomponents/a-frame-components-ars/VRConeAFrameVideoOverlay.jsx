import React from 'react';

/**
 * VRConeAFrameVideoOverlay - Overlay A-Frame optimizado para mostrar video
 * Versión simplificada enfocada en el rendimiento del video
 */
const VRConeAFrameVideoOverlay = ({
  radiusBase = 8,
  height = 10,
  showUserMarker = true,
  targetObjectId = "user-marker",
  targetObjectType = "sphere",
  targetObjectProps = {},
  lookAtTarget = false,
  targetPosition = [0, 0.15, 0]
}) => {
  
  const generateTargetObject = () => {
    const position = `${targetPosition[0]} ${targetPosition[1]} ${targetPosition[2]}`;
    const color = targetObjectProps.color || "#FF0000";
    const opacity = targetObjectProps.opacity || 0.7;
    const otherProps = targetObjectProps;
    
    switch (targetObjectType) {
      case "sphere":
        return `<a-sphere id="${targetObjectId}" position="${position}" radius="${otherProps.radius || 0.15}" color="${color}" opacity="${opacity}"></a-sphere>`;
      default:
        return `<a-sphere id="${targetObjectId}" position="${position}" radius="${otherProps.radius || 0.15}" color="${color}" opacity="${opacity}"></a-sphere>`;
    }
  };

  const videoLabels = [
    "Video A-Frame", "HTML5 Video", "WebGL Rendering", "Performance Test"
  ];

  // Generar etiquetas alrededor del video
  let labelHTML = '';
  videoLabels.forEach((label, i) => {
    const angle = (i * 2 * Math.PI) / videoLabels.length;
    const x = radiusBase * Math.cos(angle);
    const z = radiusBase * Math.sin(angle);
    const y = height - 2;

    labelHTML += `
      <a-box
        position="${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}"
        width="3"
        height="0.8"
        depth="0.1"
        color="#1a1a1a"
        opacity="0.9">
        <a-text
          value="${label}"
          color="#00ff88"
          align="center"
          width="6"
          position="0 0 0.06">
        </a-text>
      </a-box>
    `;
  });

  const srcDoc = `
    <html>
      <head>
        <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
      </head>
      <body style="margin:0; background:transparent;">
        <a-scene embedded vr-mode-ui="enabled: false" style="width: 100vw; height: 100vh; background: transparent;">
          <a-assets>
            <video id="video-local-1" src="/videos/sample.mp4" loop="true" muted="true" autoplay="true" playsinline="true" crossorigin="anonymous"></video>
            <video id="video-local-2" src="/videos/gangstas.mp4" loop="true" muted="true" autoplay="true" playsinline="true" crossorigin="anonymous"></video>
          </a-assets>
          
          <!-- Video principal en el centro -->
          <a-video
            src="#video-local-1"
            position="0 ${height/2} 0"
            width="5"
            height="4"
            play="true"
            loop="true">
          </a-video>
          
          <!-- Video secundario para comparación -->
          <a-video
            src="#video-local-2"
            position="6 ${height/2} 0"
            width="3"
            height="2"
            play="true"
            loop="true">
          </a-video>

          ${labelHTML}
          
          <!-- Indicador de rendimiento -->
          <a-sphere
            position="0 0 0"
            radius="0.3"
            color="#00ff88"
            opacity="0.8">
          </a-sphere>
          
          <!-- Información de rendimiento -->
          <a-text
            value="A-FRAME VIDEO TEST"
            position="0 -1 0"
            color="#00ff88"
            align="center"
            width="8">
          </a-text>

          ${showUserMarker ? `
          <!-- Objeto objetivo configurable -->
          ${generateTargetObject()}
          ` : ''}
          
          <!-- Cámara a altura de persona -->
          <a-camera position="0 1.8 0" rotation="0 0 0"></a-camera>
        </a-scene>
      </body>
    </html>
  `;
  
  return (
    <iframe
      title="VRCone A-Frame Video Overlay"
      srcDoc={srcDoc}
      style={{ 
        width: '100%', 
        height: '100%', 
        border: 'none', 
        background: 'transparent', 
        pointerEvents: 'auto' 
      }}
      allow="xr-spatial-tracking; fullscreen"
    />
  );
};

export default VRConeAFrameVideoOverlay;
