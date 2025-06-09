import React from 'react';

const VRWorld = ({ diameter, position }) => {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[diameter / 2, 32]} />
      <meshStandardMaterial color="green" />
    </mesh>
  );
};

export default VRWorld;
