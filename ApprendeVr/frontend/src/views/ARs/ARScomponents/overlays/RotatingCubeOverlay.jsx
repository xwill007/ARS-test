import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * Overlay de cubo rotatorio - Ejemplo de overlay interactivo
 */
const RotatingCubeOverlay = ({ 
  position = [1, 1, -3], 
  color = "#ff6b6b", 
  rotationSpeed = 0.01 
}) => {
  const meshRef = useRef();
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += rotationSpeed;
      meshRef.current.rotation.y += rotationSpeed;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};

export default RotatingCubeOverlay;
