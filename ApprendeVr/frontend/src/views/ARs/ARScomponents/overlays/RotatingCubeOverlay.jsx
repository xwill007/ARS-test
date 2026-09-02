import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * Overlay de cubo rotatorio - Ejemplo de overlay interactivo
 */
const RotatingCubeOverlay = ({
  position = [1, 1, -3],
  color = "#ff6b6b",
  clickedColor = "#4CAF50",
  rotationSpeed = 0.01
}) => {
  const meshRef = useRef();
  const [clicked, setClicked] = useState(false);

  const handleClick = () => setClicked((prev) => !prev);

  // Se marca como interactivo para el raycaster de mirada (VRCursorArs), que apunta
  // desde el centro de la pantalla y dispara userData.onClick al completar el
  // temporizador de permanencia, además del onClick directo de mouse/touch.
  useEffect(() => {
    if (!meshRef.current) return;
    meshRef.current.userData.interactive = true;
    meshRef.current.userData.onClick = handleClick;
  }, []);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += rotationSpeed;
      meshRef.current.rotation.y += rotationSpeed;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        handleClick();
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={clicked ? clickedColor : color} />
    </mesh>
  );
};

export default RotatingCubeOverlay;
