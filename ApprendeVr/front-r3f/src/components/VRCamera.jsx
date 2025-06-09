import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';

const VRCamera = ({ positionOffset = [0, 0, 0] }) => {
  const { camera } = useThree();
  const offset = useRef(new Vector3(...positionOffset));

  useFrame(() => {
    // Set the camera's position relative to the VRUser's position
    camera.position.copy(offset.current);
  });

  return null;
};

export default VRCamera;