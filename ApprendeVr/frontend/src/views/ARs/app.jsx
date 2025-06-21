import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, OrbitControls } from '@react-three/drei';
import VRWorld from '../../components/VRWorld/VRWorld';
import ARSExperience from './ARScomponents/ARSExperience';
import VRDomo from '../../components/VRViews/VRDomo';
import TestHtmlOverlay from './TestHtmlOverlay';
import TestR3FOverlay from './TestR3FOverlay';

const MyReactOverlay = () => (
  <group>
    <VRWorld diameter={2} position={[0, 0, 0]} />
  </group>
);

const ARSApp = () => {
  const [selectedOverlay, setSelectedOverlay] = useState('TestHtmlOverlay'); // o 'TestR3FOverlay'

  let overlay;
  switch (selectedOverlay) {
    case 'TestHtmlOverlay':
      overlay = <TestHtmlOverlay />;
      // overlay = <VRDomo />; // Descomenta para probar VRDomo real
      break;
    case 'TestR3FOverlay':
      overlay = <TestR3FOverlay />;
      // overlay = <MyReactOverlay />; // Descomenta para probar overlay R3F real
      break;
    default:
      overlay = null;
  }

  return (
    <>
      <Canvas camera={{ position: [0, 2, 5] }}>
        <Sky sunPosition={[100, 10, 100]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <OrbitControls />
        <VRWorld diameter={10} position={[0, 0, 0]} />
      </Canvas>
      {/* Selector visual para overlays */}
      <div style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 5000 }}>
        <button
          style={{ marginRight: 8, padding: 6 }}
          onClick={() => setSelectedOverlay('TestHtmlOverlay')}
        >Test HTML Overlay</button>
        <button
          style={{ padding: 6 }}
          onClick={() => setSelectedOverlay('TestR3FOverlay')}
        >Test R3F Overlay</button>
      </div>
      <ARSExperience floatingButtonProps={{ bottom: 32, right: 32, scale: 1 }} overlay={overlay} />
    </>
  );
};

export default ARSApp;
