import React from 'react';
import { Color } from 'three';

const VRWorld = ({ diameter, position }) => {
  const greenColor = new Color(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--green').slice(1), 16));
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[diameter / 2, 32]} />
      <meshStandardMaterial color={greenColor} />
    </mesh>
  );
};

export default VRWorld;
