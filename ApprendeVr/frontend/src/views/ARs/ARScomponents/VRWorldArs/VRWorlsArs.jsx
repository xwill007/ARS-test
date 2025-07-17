import React from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import VRPlaneArs from './VRPlaneArs';

const FLOOR_SIZE = 10;

const VRWorldArs = ({ children, floorPosition = [0, 0, 0] }) => {
  const { camera } = useThree();

  useFrame(() => {
    const { x, z } = camera.position;
    if (Math.abs(x) > FLOOR_SIZE / 2 || Math.abs(z) > FLOOR_SIZE / 2) {
      camera.position.y -= 0.1;
      if (camera.position.y < -10) {
        camera.position.set(0, 2, 0);
      }
    } else {
      if (camera.position.y < 2) camera.position.y = 2;
    }
  });

  return (
    <>
      <VRPlaneArs size={FLOOR_SIZE} position={floorPosition} />
      {children}
    </>
  );
};

export default VRWorldArs;