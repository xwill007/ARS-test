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

function generateConeSpiralHTML(font, fontImage, palabras = listaPalabras, radiusBase = 6, height = 3, targetObject = "#user-marker", lookAtTarget = false, panelSpacing = 0.08, spiralSpacing = 0.3) {
  const numPanels = palabras.length;
  let panels = '';

  // Dividir las palabras en niveles según el radio
  const levels = [];
  const totalLevels = 10; // Número de niveles en el cono
  // Variable fija para separación entre paneles
  const panelGap = 0.03; // Ajusta este valor para más o menos separación
  // Construir niveles de abajo (más bajo) a arriba (más alto)
  for (let level = 0; level < totalLevels; level++) {
    const currentRadius = radiusBase - (level * (radiusBase / totalLevels));
    if (currentRadius <= 0.3) break;
    const panelWidth = currentRadius > 2 ? 2.0 : 1.5;
    const circumference = 2 * Math.PI * currentRadius;
    const maxPanelsInLevel = Math.floor(circumference / (panelWidth + panelGap));
    // Altura normal: el nivel 0 es el más bajo
    const levelHeight = (level * height) / totalLevels + 0.25;
    levels.push({
      radius: currentRadius,
      height: levelHeight,
      maxPanels: maxPanelsInLevel,
      panelWidth: panelWidth
    });
  }
  let currentWordIndex = 0;
  // Espiral continua: avanza por todos los niveles y palabras, incrementando ángulo y altura progresivamente
  let spiralAngle = 0;
  let spiralY = 0.25; // base del cono
  let spiralLevel = 0;
  let spiralRadius = radiusBase;
  let spiralHeightStep = height / (numPanels > 1 ? numPanels - 1 : 1);
  for (let idx = 0; idx < numPanels; idx++) {
    // Calcular el nivel actual según la altura
    spiralLevel = Math.floor((spiralY - 0.25) / (height / levels.length));
    if (spiralLevel >= levels.length) spiralLevel = levels.length - 1;
    const level = levels[spiralLevel];
    spiralRadius = level.radius;
    const palabra = palabras[idx];
    const wordLen = palabra.en ? palabra.en.length : 1;
    const sizePerLetter = 0.22;
    const minPanelWidth = 1.2;
    const maxPanelWidth = 4.0;
    const panelWidth = Math.max(minPanelWidth, Math.min(wordLen * sizePerLetter, maxPanelWidth));
    const arcLength = panelWidth + panelSpacing;
    const angleDelta = arcLength / spiralRadius;
    const x = spiralRadius * Math.cos(spiralAngle);
    const z = spiralRadius * Math.sin(spiralAngle);
    const y = spiralY;
    const lookAtAttribute = lookAtTarget ? `look-at="${targetObject}"` : '';
    const panelHeight = spiralRadius > 2 ? 0.6 : 0.4;
    const panelDepth = spiralRadius > 2 ? 0.1 : 0.06;
    const textWidth = spiralRadius > 2 ? 8.0 : 6.0;
    panels += `
      <a-box
        position="${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}"
        width="${panelWidth.toFixed(2)}"
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
    spiralAngle += angleDelta;
    spiralY += spiralHeightStep;
  }
  // Si hay más palabras que paneles posibles en los niveles del cono, las palabras extra NO se muestran ni se agregan arriba.
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
  // panelSpacing configurable
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
  
  // Forzar rerender también si cambian las palabras o el archivo de palabras
  const key = `${panelSpacing}-${palabras.length}-${wordFile}`;
  return (
    <iframe
      key={key}
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
