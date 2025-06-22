import React from 'react';
import { useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import VRClickArs from './VRClickArs';

const VRCursorArs = () => {
  const { camera } = useThree();
  const pointerPos = camera.position.clone().add(new Vector3(0, 0, -1));
  return (
    <mesh position={pointerPos}>
      <sphereGeometry args={[0.05, 16, 16]} />
      <meshStandardMaterial color={'#2196f3'} />
      <VRClickArs />
    </mesh>
  );
};

export default VRCursorArs;