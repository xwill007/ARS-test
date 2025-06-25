import React from 'react';
import { Text } from '@react-three/drei';

// Usando la misma lista de palabras que VRConeOverlay
const listaPalabras = [
  "Realidad Virtual", "Inmersión", "Interactividad", "Presencia",
  "Avatar", "Mundo Virtual", "Simulación", "Experiencia",
  "Tecnología", "Innovación", "Futuro", "Digital",
  "3D", "Espacial", "Sensorial", "Cognitivo"
];

const VRConeR3FOverlay = () => {
  const radiusBase = 15;
  const height = 15;
  const numPanels = listaPalabras.length;
  const angleIncrement = (6 * Math.PI) / numPanels;
  const heightIncrement = height / numPanels;

  return (
    <group>
      {listaPalabras.map((palabra, i) => {
        const angle = i * angleIncrement;
        const currentRadius = radiusBase - (i * (radiusBase / numPanels));
        const x = currentRadius * Math.cos(angle);
        const z = currentRadius * Math.sin(angle);
        const y = i * heightIncrement;

        return (
          <group key={i} position={[x, y, z]} rotation={[0, -angle, 0]}>
            {/* Panel de fondo */}
            <mesh>
              <boxGeometry args={[3, 0.8, 0.1]} />
              <meshStandardMaterial 
                color="#222" 
                opacity={0.85} 
                transparent 
              />
            </mesh>
            {/* Texto */}
            <Text
              position={[0, 0, 0.06]}
              fontSize={0.3}
              color="#00ff00"
              anchorX="center"
              anchorY="middle"
              maxWidth={2.8}
            >
              {palabra}
            </Text>
          </group>
        );
      })}
      
      {/* Esfera central de referencia */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.5]} />
        <meshStandardMaterial 
          color="#ff4444" 
          opacity={0.7} 
          transparent 
        />
      </mesh>
    </group>
  );
};

export default VRConeR3FOverlay;