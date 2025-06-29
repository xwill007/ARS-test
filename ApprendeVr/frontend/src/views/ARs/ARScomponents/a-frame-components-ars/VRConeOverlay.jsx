import React, { useState } from 'react';

// Lista de palabras (100 palabras)
const listaPalabras = [
  { es: "aire", en: "air" },
  { es: "agua", en: "water" },
  { es: "fuego", en: "fire" },
  { es: "tierra", en: "earth" },
  { es: "vida", en: "life" },
  { es: "amor", en: "love" },
  { es: "paz", en: "peace" },
  { es: "luz", en: "light" },
  { es: "cielo", en: "sky" },
  { es: "mar", en: "sea" },
  { es: "sol", en: "sun" },
  { es: "luna", en: "moon" },
  { es: "estrella", en: "star" },
  { es: "nube", en: "cloud" },
  { es: "viento", en: "wind" },
  { es: "lluvia", en: "rain" },
  { es: "nieve", en: "snow" },
  { es: "montana", en: "mountain" },
  { es: "rio", en: "river" },
  { es: "lago", en: "lake" },
  { es: "bosque", en: "forest" },
  { es: "arbol", en: "tree" },
  { es: "flor", en: "flower" },
  { es: "planta", en: "plant" },
  { es: "animal", en: "animal" },
  { es: "pajaro", en: "bird" },
  { es: "pez", en: "fish" },
  { es: "insecto", en: "insect" },
  { es: "humano", en: "human" },
  { es: "nino", en: "child" },
  { es: "familia", en: "family" },
  { es: "amigo", en: "friend" },
  { es: "casa", en: "house" },
  { es: "hogar", en: "home" },
  { es: "ciudad", en: "city" },
  { es: "pais", en: "country" },
  { es: "mundo", en: "world" },
  { es: "universo", en: "universe" },
  { es: "tiempo", en: "time" },
  { es: "espacio", en: "space" },
  { es: "color", en: "color" },
  { es: "sonido", en: "sound" },
  { es: "musica", en: "music" },
  { es: "arte", en: "art" },
  { es: "ciencia", en: "science" },
  { es: "historia", en: "history" },
  { es: "futuro", en: "future" },
  { es: "presente", en: "present" },
  { es: "pasado", en: "past" },
  { es: "cambio", en: "change" },
  { es: "movimiento", en: "movement" },
  { es: "energia", en: "energy" },
  { es: "fuerza", en: "strength" },
  { es: "poder", en: "power" },
  { es: "mente", en: "mind" },
  { es: "cuerpo", en: "body" },
  { es: "salud", en: "health" },
  { es: "felicidad", en: "happiness" },
  { es: "tristeza", en: "sadness" },
  { es: "alegria", en: "joy" },
  { es: "realidad", en: "reality" },
  { es: "verdad", en: "truth" },
  { es: "sabiduria", en: "wisdom" },
  { es: "conocimiento", en: "knowledge" },
  { es: "idea", en: "idea" },
  { es: "pensamiento", en: "thought" },
  { es: "palabra", en: "word" },
  { es: "libro", en: "book" },
  { es: "historia", en: "story" },
  { es: "camino", en: "path" },
  { es: "viaje", en: "journey" },
  { es: "aventura", en: "adventure" },
  { es: "descubrimiento", en: "discovery" },
  { es: "misterio", en: "mystery" },
  { es: "secreto", en: "secret" },
  { es: "memoria", en: "memory" },
  { es: "esperanza", en: "hope" },
  { es: "deseo", en: "desire" },
  { es: "voluntad", en: "will" },
  { es: "libertad", en: "freedom" },
  { es: "justicia", en: "justice" },
  { es: "igualdad", en: "equality" },
  { es: "respeto", en: "respect" },
  { es: "valor", en: "courage" },
  { es: "coraje", en: "bravery" },
  { es: "fortaleza", en: "strength" },
  { es: "compasion", en: "compassion" },
  { es: "generosidad", en: "generosity" },
  { es: "gratitud", en: "gratitude" },
  { es: "belleza", en: "beauty" },
  { es: "armonia", en: "harmony" },
  { es: "equilibrio", en: "balance" },
  { es: "unidad", en: "unity" },
  { es: "diversidad", en: "diversity" },
  { es: "creacion", en: "creation" },
  { es: "evolucion", en: "evolution" },
  { es: "naturaleza", en: "nature" },
  { es: "tecnologia", en: "technology" },
  { es: "humanidad", en: "humanity" }
];

// Fuentes MSDF
const ULTRA_MSDF = {
  font: "/fonts/Ultra-msdf/Ultra-msdf.json",
  image: "/fonts/Ultra-msdf/Ultra-msdf.png"
};

function generateConeSpiralHTML(font, fontImage, palabras = listaPalabras, radiusBase = 6, height = 3, targetObject = "#user-marker", lookAtTarget = false, panelSpacing = 0.1, spiralSpacing = 0.3) {
  const numPanels = palabras.length;
  let panels = '';

  // Dividir las palabras en niveles según el radio
  const levels = [];
  const totalLevels = 10; // Número de niveles en el cono
  
  for (let level = 0; level < totalLevels; level++) {
    // Radio actual del nivel (de grande a pequeño)
    const currentRadius = radiusBase - (level * (radiusBase / totalLevels));
    
    if (currentRadius <= 0.3) break; // No crear niveles muy pequeños
    
    // Calcular cuántos paneles caben en este nivel con el nuevo espaciado
    const panelWidth = currentRadius > 2 ? 2.0 : 1.5; // Paneles más pequeños en niveles pequeños
    const circumference = 2 * Math.PI * currentRadius;
    // Usar spiralSpacing en lugar de panelSpacing para mejor control
    const maxPanelsInLevel = Math.floor(circumference / (panelWidth + spiralSpacing));
    
    // Altura del nivel
    const levelHeight = (level * height) / totalLevels + 0.25;
    
    levels.push({
      radius: currentRadius,
      height: levelHeight,
      maxPanels: maxPanelsInLevel,
      panelWidth: panelWidth
    });
  }
  
  // Distribuir las palabras en los niveles
  let currentWordIndex = 0;
  
  for (let levelIndex = 0; levelIndex < levels.length && currentWordIndex < numPanels; levelIndex++) {
    const level = levels[levelIndex];
    const wordsInThisLevel = Math.min(level.maxPanels, numPanels - currentWordIndex);
    
    // Distribuir uniformemente las palabras en este nivel
    for (let i = 0; i < wordsInThisLevel; i++) {
      if (currentWordIndex >= numPanels) break;
      
      // Añadir un pequeño offset rotacional para crear efecto espiral suave
      const spiralOffset = levelIndex * 0.2; // Offset entre niveles
      const angle = (i * 2 * Math.PI) / wordsInThisLevel + spiralOffset;
      const x = level.radius * Math.cos(angle);
      const z = level.radius * Math.sin(angle);
      const y = level.height;
      
      const palabra = palabras[currentWordIndex];
      const lookAtAttribute = lookAtTarget ? `look-at="${targetObject}"` : '';
      
      // Ajustar tamaño del panel según el radio
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
          opacity="0.85"
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
            position="0 0 ${(panelDepth + 0.02).toFixed(2)}">
          </a-text>
        </a-box>
      `;
      
      currentWordIndex++;
    }
  }
  
  // Si quedan palabras, ponerlas en la punta en círculos concéntricos muy pequeños
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
            position="0 0 0.04">
          </a-text>
        </a-box>
      `;
    }
  }
  
  // Agregar un plano como referencia del piso
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
  palabras = listaPalabras,
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
  panelSpacing = 0.3, // Espaciado general entre paneles
  spiralSpacing = 0.0 // Nueva variable para espaciado entre espirales
}) => {
  const [font, setFont] = useState(ULTRA_MSDF);
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
