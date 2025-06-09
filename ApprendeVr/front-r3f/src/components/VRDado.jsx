import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';

const Box = ({ size }) => {
  // Función para crear el texto en las caras de la caja
  const createText = (position, rotation, number) => {
    return (
      <Text position={position} rotation={rotation} fontSize={0.2 * size[0]} color="black">
        {number}
      </Text>
    );
  };

  return (
    <mesh>
      <boxGeometry args={size} />
      <meshStandardMaterial color="white" />
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

const VRScene = () => {
  const boxSize = [3, 3, 3]; // Tamaño de la caja (ancho, alto, profundidad)

  return (
    <Canvas>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Box size={boxSize} />
      <OrbitControls />
    </Canvas>
  );
};

export default VRScene;
