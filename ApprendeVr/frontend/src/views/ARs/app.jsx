import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, OrbitControls } from '@react-three/drei';
import VRWorld from '../../components/VRWorld/VRWorld';
import ARSExperience from './ARScomponents/ARSExperience';

const ARSApp = () => {
  return (
    <>
      <Canvas camera={{ position: [0, 2, 5] }}>
        <Sky sunPosition={[100, 10, 100]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <OrbitControls />
        <VRWorld diameter={10} position={[0, 0, 0]} />
      </Canvas>
      <ARSExperience floatingButtonProps={{ bottom: 32, right: 32, scale: 1 }} />
    </>
  );
};

export default ARSApp;
