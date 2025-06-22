import React from 'react';
import { useTexture } from '@react-three/drei';
import { RepeatWrapping } from 'three';

const VRPlaneArs = ({ size = 10 }) => {
  const texture = useTexture('/images/piso_ajedrez.jpg'); // Usa la misma ruta que VRFloor

  // Configura la textura para que se repita
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(size, size);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.7}
        metalness={0.2}
      />
    </mesh>
  );
};

export default VRPlaneArs;