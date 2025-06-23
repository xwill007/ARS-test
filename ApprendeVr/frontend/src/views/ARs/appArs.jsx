import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import VRWorldArs from './ARScomponents/VRWorldArs/VRWorlsArs';
import ARSExperience from './ARScomponents/ARSExperience';
import TestHtmlOverlay from './ARScomponents/ARStest/TestHtmlOverlay';
import TestR3FOverlay from './ARScomponents/ARStest/TestR3FOverlay';
import VRDomoOverlay from './ARScomponents/a-frame-components-ars/VRDomoOverlay';
import VRUserArs from './ARScomponents/VRUserArs/VRUserArs';
import ARStrackingView from './ARSviews/ARStrackingView';

const overlays = {
  TestHtmlOverlay: {
    type: 'html',
    component: <TestHtmlOverlay />
  },
  TestR3FOverlay: {
    type: 'r3f',
    component: <TestR3FOverlay />
  },
  VRDomo: {
    type: 'html',
    component: <VRDomoOverlay />
  }
};

const ARSApp = () => {
  const [selectedOverlay, setSelectedOverlay] = useState('TestHtmlOverlay');
  const [showARStracking, setShowARStracking] = useState(false); // Nuevo estado
  const overlayObj = overlays[selectedOverlay];

  return (
    <>
      {showARStracking ? (
        <ARStrackingView onClose={() => setShowARStracking(false)} />
      ) : (
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

          <div style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 5000 }}>
            <button
              style={{ marginRight: 8, padding: 6 }}
              onClick={() => setSelectedOverlay('TestHtmlOverlay')}
            >Test HTML Overlay</button>
            <button
              style={{ marginRight: 8, padding: 6 }}
              onClick={() => setSelectedOverlay('TestR3FOverlay')}
            >Test R3F Overlay</button>
            <button
              style={{ marginRight: 8, padding: 6 }}
              onClick={() => setSelectedOverlay('VRDomo')}
            >VRDomo Overlay</button>
            <button
              style={{ marginRight: 8, padding: 6, background: '#0af', color: '#fff' }}
              onClick={() => setShowARStracking(true)}
            >AR Tracking View</button>
          </div>

          {overlayObj.type === 'html' && overlayObj.component}
          <ARSExperience
            floatingButtonProps={{ bottom: 32, right: 32, scale: 1 }}
            overlay={overlayObj.component}
            overlayType={overlayObj.type}
          />
        </>
      )}
    </>
  );
};

export default ARSApp;