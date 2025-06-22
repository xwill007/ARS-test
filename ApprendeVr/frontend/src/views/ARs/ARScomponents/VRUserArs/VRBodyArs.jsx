import React from 'react';
const VRBodyArs = ({ position = [0, 0, 0] }) => (
  <mesh position={position}>
    <boxGeometry args={[0.3, 1.2, 0.3]} />
    <meshStandardMaterial color="gray" />
  </mesh>
);
export default VRBodyArs;