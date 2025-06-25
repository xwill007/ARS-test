import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import VRWorldArs from './ARScomponents/VRWorldArs/VRWorlsArs';
import ARSExperience from './ARScomponents/ARSExperience';
import TestHtmlOverlay from './ARScomponents/ARStest/TestHtmlOverlay';
import TestR3FOverlay from './ARScomponents/ARStest/TestR3FOverlay';
import VRConeOverlay from './ARScomponents/a-frame-components-ars/VRConeOverlay';
import VRUserArs from './ARScomponents/VRUserArs/VRUserArs';
import ARStrackingView from './ARSviews/ARStrackingView';
import XRStereoView from './ARSviews/XRStereoView'; // <--- Importa tu nuevo componente

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
    component: <VRConeOverlay />
  }
};

const ARSApp = () => {
  const [selectedOverlay, setSelectedOverlay] = useState('TestHtmlOverlay');
  const [showARStracking, setShowARStracking] = useState(false);
  const [showXRStereo, setShowXRStereo] = useState(false); // <--- Nuevo estado
  const overlayObj = overlays[selectedOverlay];

  return (
    <>
      {showARStracking ? (
        <ARStrackingView onClose={() => setShowARStracking(false)} />
      ) : showXRStereo ? (
        <XRStereoView onClose={() => setShowXRStereo(false)} />
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

          <div style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 5000, display: 'flex', gap: 8 }}>
            <button
              style={{ padding: 6 }}
              onClick={() => setSelectedOverlay('TestHtmlOverlay')}
            >Test HTML Overlay</button>
            <button
              style={{ padding: 6 }}
              onClick={() => setSelectedOverlay('TestR3FOverlay')}
            >Test R3F Overlay</button>
            <button
              style={{ padding: 6 }}
              onClick={() => setSelectedOverlay('VRDomo')}
            >VRCone Overlay</button>
            <button
              style={{ padding: 6, background: '#0af', color: '#fff' }}
              onClick={() => setShowARStracking(true)}
            >AR Tracking View</button>
            {/* Botón para modo estéreo */}
            <button
              style={{ padding: 6, background: '#222', color: '#fff', display: 'flex', alignItems: 'center' }}
              onClick={() => setShowXRStereo(true)}
              title="Vista Estéreo"
            >
              {/* Ícono SVG vr-glasses-panel */}
              <svg width="24" height="24" viewBox="0 0 512 512" fill="none">
                <rect x="16" y="64" width="480" height="384" rx="16" stroke="currentColor" strokeWidth="32" fill="none"/>
                <path d="M432 400c-32 0-48-16-64-48-16-32-32-48-64-48s-48 16-64 48c-16 32-32 48-64 48s-48-16-64-48V112h384v240c-16 32-32 48-64 48z" fill="currentColor"/>
                <circle cx="144" cy="288" r="32" fill="#fff"/>
                <circle cx="368" cy="288" r="32" fill="#fff"/>
              </svg>
            </button>
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