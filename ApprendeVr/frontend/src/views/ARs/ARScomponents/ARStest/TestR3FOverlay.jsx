import React from 'react';

const TestR3FOverlay = () => (
  <>
    <mesh position={[0, 1.0, 0]}>
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshStandardMaterial color="orange" />
    </mesh>
    <mesh position={[0, 0.5, 0]}>
      <boxGeometry args={[1, 0.05, 1]} />
      <meshStandardMaterial color="blue" />
    </mesh>
  </>
);

export default TestR3FOverlay;
