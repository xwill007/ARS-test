import React from 'react';

/**
 * Ejemplo de overlay usando geometría básica para demostrar el sistema
 */
const CubeOverlay = ({ 
  position = [2, 1, -3], 
  color = "#ff6b6b",
  size = [1, 1, 1],
  rotation = [0, 0, 0]
}) => {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};

export default CubeOverlay;
