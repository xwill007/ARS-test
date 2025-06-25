import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import VRWorldArs from './ARScomponents/VRWorldArs/VRWorlsArs';
import ARSExperience from './ARScomponents/ARSExperience';
import TestR3FOverlay from './ARScomponents/ARStest/TestR3FOverlay';
import VRConeOverlay from './ARScomponents/a-frame-components-ars/VRConeOverlay';
import VRConeR3FOverlay from './ARScomponents/ARStest/VRConeR3FOverlay';
import VRUserArs from './ARScomponents/VRUserArs/VRUserArs';

const overlays = {
  TestR3FOverlay: {
    type: 'r3f',
    component: <TestR3FOverlay />
  },
  VRConeOverlay: {
    type: 'html',
    component: <VRConeOverlay />
  },
  VRConeR3FOverlay: {
    type: 'r3f',
    component: <VRConeR3FOverlay />
  }
};

const ARSApp = () => {
  const [selectedOverlay, setSelectedOverlay] = useState('VRConeOverlay');
  const overlayObj = overlays[selectedOverlay];

  return (
    <>
      <Canvas camera={{ position: [0, 2, 5] }}>
        <Sky sunPosition={[100, 10, 100]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <VRWorldArs>
          <VRUserArs mode="first">
            {overlayObj.type === 'r3f' && overlayObj.component}
          </VRUserArs>
        </VRWorldArs>
      </Canvas>

      <div style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 5000, display: 'flex', gap: 8 }}>
        <button
          style={{ padding: 6 }}
          onClick={() => setSelectedOverlay('TestR3FOverlay')}
        >Overlay Static</button>
        <button
          style={{ padding: 6 }}
          onClick={() => setSelectedOverlay('VRConeOverlay')}
        >Overlay HTML</button>
        <button
          style={{ padding: 6 }}
          onClick={() => setSelectedOverlay('VRConeR3FOverlay')}
        >Overlay R3F</button>
      </div>

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