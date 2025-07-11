import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';

/**
 * Overlay con cubo rotatorio para pruebas de espejo estereoscópico
 */
const CuboRotatorio = ({ 
  position = [0, 0, -2], 
  scale = [0.5, 0.5, 0.5],
  color = '#ff6b6b',
  rotationSpeed = 0.01,
  wireframe = false,
  showLabel = true
}) => {
  const meshRef = useRef();

  // Animación de rotación
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += rotationSpeed;
      meshRef.current.rotation.y += rotationSpeed * 1.2;
      meshRef.current.rotation.z += rotationSpeed * 0.8;
    }
  });

  return (
    <group>
      {/* Cubo principal */}
      <mesh ref={meshRef} position={position} scale={scale}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
          color={color} 
          wireframe={wireframe}
          transparent={true}
          opacity={0.8}
        />
      </mesh>

      {/* Luces para iluminar el cubo */}
      <ambientLight intensity={0.6} />
      <pointLight position={[2, 2, 2]} intensity={1} />
      <pointLight position={[-2, -2, -2]} intensity={0.5} color="#4dabf7" />

      {/* Texto informativo (opcional) */}
      {showLabel && (
        <mesh position={[position[0], position[1] - 1, position[2]]}>
          {/* Aquí se podría añadir texto 3D si se necesita */}
        </mesh>
      )}
    </group>
  );
};

/**
 * Overlay principal que contiene el cubo y otros elementos
 */
const OverlayCuboRotatorio = ({ 
  isMirrorPanel = false,
  muteAudio = false,
  disableInteractions = false 
}) => {
  return (
    <>
      {/* Cubo principal */}
      <CuboRotatorio 
        position={[0, 0, -3]}
        scale={[0.8, 0.8, 0.8]}
        color={isMirrorPanel ? '#4dabf7' : '#ff6b6b'}
        rotationSpeed={0.015}
      />

      {/* Cubo secundario más pequeño */}
      <CuboRotatorio 
        position={[1.5, 0.5, -2]}
        scale={[0.3, 0.3, 0.3]}
        color={isMirrorPanel ? '#69db7c' : '#ffd43b'}
        rotationSpeed={0.025}
        wireframe={true}
      />

      {/* Cubo terciario */}
      <CuboRotatorio 
        position={[-1.2, -0.8, -2.5]}
        scale={[0.4, 0.4, 0.4]}
        color={isMirrorPanel ? '#ff8cc8' : '#74c0fc'}
        rotationSpeed={0.008}
      />

      {/* Indicador de panel en la esquina */}
      <mesh position={[2, 1.5, -1.5]} scale={[0.15, 0.15, 0.15]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial 
          color={isMirrorPanel ? '#20c997' : '#fd7e14'} 
        />
      </mesh>
    </>
  );
};

export default OverlayCuboRotatorio;
