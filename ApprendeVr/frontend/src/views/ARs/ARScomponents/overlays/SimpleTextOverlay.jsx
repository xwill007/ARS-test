import React from 'react';
import { Text } from '@react-three/drei';

/**
 * Ejemplo de overlay simple para demostrar el sistema de registro automático
 */
const SimpleTextOverlay = ({ position = [0, 3, -2], text = "¡Hola Mundo!" }) => {
  return (
    <Text
      position={position}
      fontSize={0.5}
      color="#ffffff"
      anchorX="center"
      anchorY="middle"
    >
      {text}
    </Text>
  );
};

export default SimpleTextOverlay;
