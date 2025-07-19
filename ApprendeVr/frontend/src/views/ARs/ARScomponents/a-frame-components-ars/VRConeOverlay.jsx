import React, { useState, useEffect } from 'react';
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

function generateConeSpiralHTML(font, fontImage, palabras = listaPalabras, radiusBase = 6, height = 3, targetObject = "#user-marker", lookAtTarget = false, panelSpacing = 0.08, spiralSpacing = 0.12) {
  const numPanels = palabras.length;
  let panels = '';

  // Dividir las palabras en niveles según el radio
  const levels = [];
  const totalLevels = 10; // Número de niveles en el cono
  // Usar el parámetro panelSpacing en vez de un valor fijo
  const panelGap = panelSpacing; // Ahora configurable desde la UI
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
  let spiralHeightStep = spiralSpacing > 0 ? spiralSpacing : height / (numPanels > 1 ? numPanels - 1 : 1);
  let prevPanelWidth = null;
  for (let idx = 0; idx < numPanels; idx++) {
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
    // Calcular el ángulo de separación teniendo en cuenta la mitad del panel anterior y la mitad del actual
    let angleDelta;
    if (prevPanelWidth === null) {
      // Primer panel: solo la mitad de su ancho + separación
      angleDelta = (panelWidth / 2 + panelSpacing / 2) / spiralRadius;
    } else {
      // Siguiente panel: mitad anterior + mitad actual + separación
      angleDelta = ((prevPanelWidth / 2) + (panelWidth / 2) + panelSpacing) / spiralRadius;
    }
    // Para el primer panel, no rotar antes de colocar
    if (idx === 0) {
      spiralAngle = 0;
    } else {
      spiralAngle += angleDelta;
    }
    const x = spiralRadius * Math.cos(spiralAngle);
    const z = spiralRadius * Math.sin(spiralAngle);
    const y = spiralY;
    const lookAtAttribute = lookAtTarget ? `look-at="${targetObject}"` : '';
    const panelHeight = spiralRadius > 2 ? 0.1 : 0.22; // Reducido el alto del panel
    const panelDepth = spiralRadius > 2 ? 0.01 : 0.06;
    const textWidth = spiralRadius > 2 ? 8.0 : 6.0;
    const theta = Math.atan2(x, z) * 180 / Math.PI;
    panels += `
      <a-entity class="clickable" panel-flip position="${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}" rotation="0 ${theta.toFixed(2)} 0" ${lookAtAttribute}>
        <a-box class="clickable"
          width="${panelWidth.toFixed(2)}" height="${panelHeight}" depth="${panelDepth}" color="#222" opacity="0.0"
          event-set__1="_event: click; _target: ..; click: true"
        ></a-box>
        <!-- Cara frontal: palabra en inglés -->
        <a-text class="clickable"
          value="${palabra.en}" color="#FFCC00" align="center" width="${textWidth}" font="${font}" font-image="${fontImage}" shader="msdf"
          position="0 0.35 ${panelDepth/2 + 0.01}"
          event-set__2="_event: click; _target: ..; click: true"
        ></a-text>
        <!-- Cara trasera: traducción -->
        <a-text class="clickable"
          value="${palabra.es || ''}" color="#00CCFF" align="center" width="${textWidth}" font="${font}" font-image="${fontImage}" shader="msdf"
          position="0 0.35 -${panelDepth/2 + 0.01}" rotation="0 180 0"
          event-set__3="_event: click; _target: ..; click: true"
        ></a-text>
      </a-entity>
    `;
    prevPanelWidth = panelWidth;
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
  
  const showLogs = true; // Cambia a false para desactivar logs

  const srcDoc = `
    <html>
      <head>
        <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
        <script>
          var showLogs = ${showLogs};
          AFRAME.registerComponent('panel-flip', {
            schema: {},
            init: function () {
              this.flipped = false;
              if (showLogs) console.log('[panel-flip] init for', this.el);
              this.el.addEventListener('click', (e) => {
                if (showLogs) console.log('[panel-flip] click event', e, 'on', this.el);
                this.flipped = !this.flipped;
                this.el.setAttribute('animation__flip', {
                  property: 'rotation.y',
                  to: this.flipped ? 180 : 0,
                  dur: 400,
                  easing: 'easeInOutQuad'
                });
                if (showLogs) console.log('[panel-flip] flipped:', this.flipped);
              });
            }
          });
          // Click automático en el primer panel tras 3 segundos
          document.addEventListener('DOMContentLoaded', function() {
            if (showLogs) console.log('[auto-flip] DOMContentLoaded');
            setTimeout(function() {
              var scene = document.querySelector('a-scene');
              if (!scene) {
                if (showLogs) console.warn('[auto-flip] No scene found');
                return;
              }
              scene.addEventListener('loaded', function() {
                if (showLogs) console.log('[auto-flip] Scene loaded');
                var panel = document.querySelector('.clickable[panel-flip]');
                if (showLogs) console.log('[auto-flip] Found panel:', panel);
                if(panel) {
                  panel.emit('mousedown');
                  panel.emit('click');
                  if (showLogs) console.log('[auto-flip] Emitted mousedown and click on panel');
                  var cursor = document.querySelector('[cursor]');
                  if(cursor) {
                    cursor.emit('mousedown');
                    setTimeout(() => cursor.emit('mouseup'), 120);
                    if (showLogs) console.log('[auto-flip] Emitted mousedown/mouseup on cursor');
                  }
                } else {
                  if (showLogs) console.warn('[auto-flip] No panel found for auto-flip');
                }
              });
            }, 3000);
          });
        </script>
        ${lookAtScript}
      </head>
      <body style="margin:0; background:transparent;">
        <a-scene embedded vr-mode-ui="enabled: false" style="width: 100vw; height: 100vh; background: transparent;">
          ${panelsHTML}
          ${showUserMarker ? `
          <!-- Objeto objetivo configurable -->
          ${generateTargetObject()}
          ` : ''}
          <!-- Cámara a altura de persona con cursor -->
          <a-camera position="0 1.8 0" rotation="0 0 0">
            <a-entity 
              cursor="fuse: false; rayOrigin: mouse" 
              raycaster="objects: .clickable"
              material="color: white; shader: flat"
              geometry="primitive: ring; radiusInner: 0.01; radiusOuter: 0.015"
              position="0 0 -1"
              animation__click="property: scale; startEvents: mousedown; to: 0.7 0.7 0.7; dur: 100; easing: easeOutQuad"
              animation__unclick="property: scale; startEvents: mouseup; to: 1 1 1; dur: 100; easing: easeOutQuad"
            ></a-entity>
          </a-camera>
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
