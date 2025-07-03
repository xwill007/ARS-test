import React from 'react';
import { Text } from '@react-three/drei';
import ARSVideoLocal from './ARSVideoLocal';

/**
 * VRConeR3FVideoOverlay - Overlay R3F optimizado para mostrar video
 * Versión simplificada enfocada en el rendimiento del video
 */
const VRConeR3FVideoOverlay = () => {
  const radiusBase = 8;
  const height = 10;
  const videoLabels = [
    "Video R3F", "React Three Fiber", "WebGL Rendering", "Performance Test"
  ];

  return (
    <group>
      {/* Video principal en el centro */}
      <ARSVideoLocal 
        videoSrc="/videos/sample.mp4"
        position={[0, height/2, 0]}
        scale={[5, 4, 1]}
        autoPlay={true}
        loop={true}
        muted={true}
      />
      
      {/* Video secundario para comparación */}
      <ARSVideoLocal 
        videoSrc="/videos/gangstas.mp4"
        position={[6, height/2, 0]}
        scale={[3, 2, 1]}
        autoPlay={true}
        loop={true}
        muted={true}
      />

      {/* Etiquetas informativas */}
      {videoLabels.map((label, i) => {
        const angle = (i * 2 * Math.PI) / videoLabels.length;
        const x = radiusBase * Math.cos(angle);
        const z = radiusBase * Math.sin(angle);
        const y = height - 2;

        return (
          <group key={i} position={[x, y, z]} rotation={[0, -angle, 0]}>
            <mesh>
              <boxGeometry args={[3, 0.8, 0.1]} />
              <meshStandardMaterial 
                color="#1a1a1a" 
                opacity={0.9} 
                transparent 
              />
            </mesh>
            <Text
              position={[0, 0, 0.06]}
              fontSize={0.25}
              color="#00ff88"
              anchorX="center"
              anchorY="middle"
              maxWidth={2.8}
            >
              {label}
            </Text>
          </group>
        );
      })}
      
      {/* Indicador de rendimiento */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.3]} />
        <meshStandardMaterial 
          color="#00ff88" 
          opacity={0.8} 
          transparent 
        />
      </mesh>
      
      {/* Información de rendimiento */}
      <Text
        position={[0, -1, 0]}
        fontSize={0.3}
        color="#00ff88"
        anchorX="center"
        anchorY="middle"
      >
        R3F VIDEO TEST
      </Text>
    </group>
  );
};

export default VRConeR3FVideoOverlay;
