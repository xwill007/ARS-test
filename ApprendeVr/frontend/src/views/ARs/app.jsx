import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, OrbitControls } from '@react-three/drei';
import VRWorld from '../../components/VRWorld/VRWorld';
import ARSExperience from './ARScomponents/ARSExperience';
import TestHtmlOverlay from './ARScomponents/ARStest/TestHtmlOverlay';
import TestR3FOverlay from './ARScomponents/ARStest/TestR3FOverlay';

const overlays = {
  TestHtmlOverlay: {
    type: 'html',
    component: <TestHtmlOverlay />
  },
  TestR3FOverlay: {
    type: 'r3f',
    component: <TestR3FOverlay />
  }
};

const ARSApp = () => {
  const [selectedOverlay, setSelectedOverlay] = useState('TestHtmlOverlay');
  const overlayObj = overlays[selectedOverlay];

  return (
    <>
      <Canvas camera={{ position: [0, 2, 5] }}>
        <Sky sunPosition={[100, 10, 100]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <OrbitControls />
        <VRWorld diameter={10} position={[0, 0, 0]} />
        {/* Renderiza overlay R3F dentro del Canvas */}
        {overlayObj.type === 'r3f' && overlayObj.component}
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

      {/* Renderiza overlay HTML fuera del Canvas */}
      
      {overlayObj.type === 'html' && overlayObj.component}
      <ARSExperience 
        floatingButtonProps={{ bottom: 32, right: 32, scale: 1 }} 
        overlay={overlayObj.component}
        overlayType={overlayObj.type}
      />
    </>
  );
};

export default ARSApp;
