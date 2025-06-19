import React from 'react';
import { Text } from '@react-three/drei';
import { Color } from 'three';

const Box = ({ size, position }) => {
  // Función para crear el texto en las caras de la caja
  const createText = (position, rotation, number) => {
    return (
      <Text position={position} rotation={rotation} fontSize={0.2 * size[0]} color="black">
        {number}
      </Text>
    );
  };

  const whiteColor = new Color(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--white').slice(1), 16));

  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={whiteColor} />
      {/* Llamar a la función para crear el texto en cada cara */}
      {createText([0, 0, size[2] / 2], [0, 0, 0], "1")} // Cara frontal
      {createText([0, 0, -size[2] / 2], [0, Math.PI, 0], "3")} // Cara trasera
      {createText([size[0] / 2, 0, 0], [0, Math.PI / 2, 0], "2")} // Cara derecha
      {createText([-size[0] / 2, 0, 0], [0, -Math.PI / 2, 0], "4")} // Cara izquierda
      {createText([0, size[1] / 2, 0], [-Math.PI / 2, 0, 0], "5")} // Cara superior
      {createText([0, -size[1] / 2, 0], [Math.PI / 2, 0, 0], "6")} // Cara inferior
    </mesh>
  );
};

const VRDado = ({ size, position }) => {
  return (
    <Box size={size} position={position} />
  );
};

export default VRDado;
