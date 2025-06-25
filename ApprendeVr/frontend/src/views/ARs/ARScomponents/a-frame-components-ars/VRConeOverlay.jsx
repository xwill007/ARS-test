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

function generateConeSpiralHTML(font, fontImage, palabras = listaPalabras) {
  const radiusBase = 15;
  const height = 15;
  const numPanels = palabras.length;
  const angleIncrement = (6 * Math.PI) / numPanels;
  const heightIncrement = height / numPanels;
  let panels = '';

  for (let i = 0; i < numPanels; i++) {
    const angle = i * angleIncrement;
    const currentRadius = radiusBase - (i * (radiusBase / numPanels));
    const x = currentRadius * Math.cos(angle);
    const z = currentRadius * Math.sin(angle);
    const y = i * heightIncrement;
    const palabra = palabras[i];

    panels += `
      <a-box
        position="${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}"
        width="1.5"
        height="0.5"
        depth="0.1"
        color="#222"
        opacity="0.85"
        look-at="0 0 0">
        <a-text
          value="${palabra.en}"
          color="#FFCC00"
          align="center"
          width="1.3"
          font="${font}"
          font-image="${fontImage}"
          shader="msdf"
          position="0 0 0.08">
        </a-text>
      </a-box>
    `;
  }
  return panels;
}

const VRDomoOverlay = () => {
  const [font, setFont] = useState(ULTRA_MSDF);
  const panelsHTML = generateConeSpiralHTML(font.font, font.image);
  const srcDoc = `
    <html>
      <head>
        <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
      </head>
      <body style="margin:0; background:transparent;">
        <a-scene embedded vr-mode-ui="enabled: false" style="width: 100vw; height: 100vh; background: transparent;">
          ${panelsHTML}
          <!-- Marcador donde debería estar el usuario -->
          <a-sphere position="0 0 0" radius="0.3" color="#FF0000" opacity="0.7"></a-sphere>
          <!-- Mover la cámara al centro (0 0 0) donde está la esfera roja -->
          <a-camera position="0 0 0"></a-camera>
        </a-scene>
      </body>
    </html>
  `;
  return (
    <iframe
      title="VRDomo Overlay"
      srcDoc={srcDoc}
      style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', pointerEvents: 'auto' }}
      allow="xr-spatial-tracking; fullscreen"
    />
  );
};

export default VRDomoOverlay;
