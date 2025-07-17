import React from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import VRPlaneArs from './VRPlaneArs';

const VRWorldArs = ({ children, floorPosition = [0, 0, 0], floorSize = 10, floorScale = [1, 1, 1] }) => {
  const { camera } = useThree();

  useFrame(() => {
    const { x, z } = camera.position;
    if (Math.abs(x) > floorSize / 2 || Math.abs(z) > floorSize / 2) {
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
      <VRPlaneArs size={floorSize} position={floorPosition} scale={floorScale} />
      {children}
    </>
  );
};

export default VRWorldArs;