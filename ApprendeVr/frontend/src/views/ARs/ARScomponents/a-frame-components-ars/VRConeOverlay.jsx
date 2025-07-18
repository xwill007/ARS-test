// Hook para cargar palabras desde JSON o localStorage
function useConeWords(wordFile) {
  const [words, setWords] = React.useState([]);
  React.useEffect(() => {
    const local = localStorage.getItem('cone_words_edit');
    if (local) {
      setWords(JSON.parse(local));
      return;
    }
    fetch(`/config/${wordFile || 'cone_words.json'}`)
      .then(res => res.json())
      .then(setWords)
      .catch(() => setWords([]));
  }, [wordFile]);
  return words;
}
import React, { useState, useEffect } from 'react';

// Lista de palabras (100 palabras)
const listaPalabras = [];

// Fuentes MSDF

const FONT_PRESETS = {
  'Roboto-msdf': {
    font: '/fonts/Roboto-msdf/Roboto-msdf.json',
    image: '/fonts/Roboto-msdf/Roboto.png'
  },
  'Ultra-msdf': {
    font: '/fonts/Ultra-msdf/Ultra-msdf.json',
    image: '/fonts/Ultra-msdf/Ultra-msdf.png'
  },
  'test': {
    font: '/fonts/test.fnt',
    image: '/fonts/test_0.png'
  },
  'test2': {
    font: '/fonts/test2.fnt',
    image: '/fonts/test2_0.png'
  }
};

function generateConeSpiralHTML(font, fontImage, palabras = listaPalabras, radiusBase = 6, height = 3, targetObject = "#user-marker", lookAtTarget = false, panelSpacing = 0.1, spiralSpacing = 0.3) {
  const numPanels = palabras.length;
  let panels = '';

  // Dividir las palabras en niveles según el radio
  const levels = [];
  const totalLevels = 10; // Número de niveles en el cono
  for (let level = 0; level < totalLevels; level++) {
    const currentRadius = radiusBase - (level * (radiusBase / totalLevels));
    if (currentRadius <= 0.3) break;
    const panelWidth = currentRadius > 2 ? 2.0 : 1.5;
    const circumference = 2 * Math.PI * currentRadius;
    const maxPanelsInLevel = Math.floor(circumference / (panelWidth + spiralSpacing));
    const levelHeight = (level * height) / totalLevels + 0.25;
    levels.push({
      radius: currentRadius,
      height: levelHeight,
      maxPanels: maxPanelsInLevel,
      panelWidth: panelWidth
    });
  }
  let currentWordIndex = 0;
  for (let levelIndex = 0; levelIndex < levels.length && currentWordIndex < numPanels; levelIndex++) {
    const level = levels[levelIndex];
    const wordsInThisLevel = Math.min(level.maxPanels, numPanels - currentWordIndex);
    for (let i = 0; i < wordsInThisLevel; i++) {
      if (currentWordIndex >= numPanels) break;
      const spiralOffset = levelIndex * 0.2;
      const angle = (i * 2 * Math.PI) / wordsInThisLevel + spiralOffset;
      const x = level.radius * Math.cos(angle);
      const z = level.radius * Math.sin(angle);
      const y = level.height;
      const palabra = palabras[currentWordIndex];
      const lookAtAttribute = lookAtTarget ? `look-at="${targetObject}"` : '';
      const panelHeight = level.radius > 2 ? 0.6 : 0.4;
      const panelDepth = level.radius > 2 ? 0.1 : 0.06;
      const textWidth = level.radius > 2 ? 8.0 : 6.0;
      panels += `
        <a-box
          position="${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}"
          width="${level.panelWidth}"
          height="${panelHeight}"
          depth="${panelDepth}"
          color="#222"
          ${lookAtAttribute}
          data-panel="true">
          <a-text
            value="${palabra.en}"
            color="#FFCC00"
            align="center"
            width="${textWidth}"
            font="${font}"
            font-image="${fontImage}"
            shader="msdf"
            position="0 0.35 0.06">
          </a-text>
        </a-box>
      `;
      currentWordIndex++;
    }
  }
  if (currentWordIndex < numPanels) {
    const remainingWords = numPanels - currentWordIndex;
    const tipRadius = 0.8;
    const wordsPerRing = 6;
    for (let i = 0; i < remainingWords; i++) {
      const wordInRing = i % wordsPerRing;
      const currentRing = Math.floor(i / wordsPerRing);
      const currentTipRadius = tipRadius + (currentRing * (0.3 + spiralSpacing));
      const angle = (wordInRing * 2 * Math.PI) / wordsPerRing;
      const x = currentTipRadius * Math.cos(angle);
      const z = currentTipRadius * Math.sin(angle);
      const y = height - 0.5 + (currentRing * (0.2 + spiralSpacing));
      const palabra = palabras[currentWordIndex + i];
      const lookAtAttribute = lookAtTarget ? `look-at="${targetObject}"` : '';
      panels += `
        <a-box
          position="${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}"
          width="1.2"
          height="0.3"
          depth="0.05"
          color="#222"
          opacity="0.85"
          ${lookAtAttribute}
          data-panel="true">
          <a-text
            value="${palabra.en}"
            color="#FFCC00"
            align="center"
            width="5.0"
            font="${font}"
            font-image="${fontImage}"
            shader="msdf"
            position="0 0 0.001">
          </a-text>
        </a-box>
      `;
    }
  }
  panels += `
    <a-plane 
      position="0 0 0" 
      rotation="-90 0 0" 
      width="20" 
      height="20" 
      color="#333" 
      opacity="0.3">
    </a-plane>
  `;
  return panels;
}


const VRConeOverlay = ({ 
  radiusBase = 6, 
  height = 3,
  showUserMarker = true,
  targetObjectId = "user-marker",
  targetObjectType = "sphere",
  targetObjectProps = {
    position: "0 0.15 0",
    radius: 0.15,
    color: "#FF0000",
    opacity: 0.7
  },
  lookAtTarget = false,
  panelSpacing = 0.3,
  spiralSpacing = 0.0,
  wordFile = 'cone_words.json',
  fontName = 'Roboto-msdf'
}) => {
  const font = FONT_PRESETS[fontName] || FONT_PRESETS['Roboto-msdf'];
  const coneWords = useConeWords(wordFile);
  const palabras = coneWords && coneWords.length > 0 ? coneWords : listaPalabras;
  const panelsHTML = generateConeSpiralHTML(font.font, font.image, palabras, radiusBase, height, `#${targetObjectId}`, lookAtTarget, panelSpacing, spiralSpacing);
  
  // Función para generar el objeto objetivo
  const generateTargetObject = () => {
    const { position, color, opacity, ...otherProps } = targetObjectProps;
    
    switch (targetObjectType) {
      case "sphere":
        return `<a-sphere id="${targetObjectId}" position="${position}" radius="${otherProps.radius || 0.15}" color="${color}" opacity="${opacity}"></a-sphere>`;
      
      case "box":
        return `<a-box id="${targetObjectId}" position="${position}" width="${otherProps.width || 0.3}" height="${otherProps.height || 0.3}" depth="${otherProps.depth || 0.3}" color="${color}" opacity="${opacity}"></a-box>`;
      
      case "cylinder":
        return `<a-cylinder id="${targetObjectId}" position="${position}" radius="${otherProps.radius || 0.15}" height="${otherProps.height || 0.3}" color="${color}" opacity="${opacity}"></a-cylinder>`;
      
      case "cone":
        return `<a-cone id="${targetObjectId}" position="${position}" radius-bottom="${otherProps.radiusBottom || 0.15}" radius-top="${otherProps.radiusTop || 0}" height="${otherProps.height || 0.3}" color="${color}" opacity="${opacity}"></a-cone>`;
      
      case "octahedron":
        return `<a-octahedron id="${targetObjectId}" position="${position}" radius="${otherProps.radius || 0.15}" color="${color}" opacity="${opacity}"></a-octahedron>`;
      
      case "dodecahedron":
        return `<a-dodecahedron id="${targetObjectId}" position="${position}" radius="${otherProps.radius || 0.15}" color="${color}" opacity="${opacity}"></a-dodecahedron>`;
      
      case "tetrahedron":
        return `<a-tetrahedron id="${targetObjectId}" position="${position}" radius="${otherProps.radius || 0.15}" color="${color}" opacity="${opacity}"></a-tetrahedron>`;
      
      case "torus":
        return `<a-torus id="${targetObjectId}" position="${position}" radius="${otherProps.radius || 0.15}" radius-tubular="${otherProps.radiusTubular || 0.05}" color="${color}" opacity="${opacity}"></a-torus>`;
      
      default:
        return `<a-sphere id="${targetObjectId}" position="${position}" radius="${otherProps.radius || 0.15}" color="${color}" opacity="${opacity}"></a-sphere>`;
    }
  };
  
  // Script para actualización continua del look-at si es necesario
  const lookAtScript = lookAtTarget ? `
    <script>
      // Componente personalizado para look-at continuo
      AFRAME.registerComponent('continuous-look-at', {
        schema: {
          target: {type: 'selector'}
        },
        
        init: function() {
          this.target3D = this.data.target.object3D;
          this.object3D = this.el.object3D;
        },
        
        tick: function() {
          if (this.target3D && this.object3D) {
            this.object3D.lookAt(this.target3D.position);
          }
        }
      });
      
      // Aplicar look-at continuo a todos los paneles después de que la escena esté lista
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
          const panels = document.querySelectorAll('[data-panel]');
          const target = document.querySelector('#${targetObjectId}');
          
          if (target) {
            panels.forEach(panel => {
              panel.setAttribute('continuous-look-at', 'target: #${targetObjectId}');
            });
          }
        }, 1000);
      });
    </script>
  ` : '';
  
  const srcDoc = `
    <html>
      <head>
        <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
        ${lookAtScript}
      </head>
      <body style="margin:0; background:transparent;">
        <a-scene embedded vr-mode-ui="enabled: false" style="width: 100vw; height: 100vh; background: transparent;">
          ${panelsHTML}
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
      title="VRCone Overlay"
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

export default VRConeOverlay;
