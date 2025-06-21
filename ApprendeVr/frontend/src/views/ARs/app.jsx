import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, OrbitControls } from '@react-three/drei';
import VRWorld from '../../components/VRWorld/VRWorld';
import ARSExperience from './ARScomponents/ARSExperience';
import VRDomo from '../../components/VRViews/VRDomo';

const MyReactOverlay = () => (
  <group>
    <VRWorld diameter={2} position={[0, 0, 0]} />
  </group>
);

const ARSApp = () => {
  const [overlayType, setOverlayType] = useState('aframe'); // o 'r3f'

  // Overlay de prueba para HTML/A-Frame
  const TestHtmlOverlay = () => (
    <div style={{
      position: 'absolute',
      top: 40,
      left: 40,
      width: 80,
      height: 80,
      background: 'rgba(255,0,0,0.4)',
      borderRadius: 12,
      color: '#fff',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      pointerEvents: 'none',
    }}>
      Overlay HTML
    </div>
  );

  // Overlay de prueba para R3F
  const TestR3FOverlay = () => {
    console.log('[TestR3FOverlay] Renderizando overlay R3F');
    return (
      <>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshStandardMaterial color="orange" />
        </mesh>
        <mesh position={[0, -0.5, 0]}>
          <boxGeometry args={[1, 0.05, 1]} />
          <meshStandardMaterial color="blue" />
        </mesh>
      </>
    );
  };

  let overlay;
  if (overlayType === 'aframe') {
    overlay = <TestHtmlOverlay />; // Prueba visual HTML
    // overlay = <VRDomo />; // Descomenta para probar VRDomo real
  } else {
    overlay = <TestR3FOverlay />; // Prueba visual R3F
    // overlay = <MyReactOverlay />; // Descomenta para probar overlay R3F real
  }

  if (true) console.log('[ARSApp] overlayType:', overlayType, 'overlay:', overlay);

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
          style={{ marginRight: 8, padding: 6, fontWeight: overlayType === 'aframe' ? 'bold' : 'normal' }}
          onClick={() => setOverlayType('aframe')}
        >A-Frame (VRDomo)</button>
        <button
          style={{ padding: 6, fontWeight: overlayType === 'r3f' ? 'bold' : 'normal' }}
          onClick={() => setOverlayType('r3f')}
        >R3F (VRWorld)</button>
      </div>
      <ARSExperience floatingButtonProps={{ bottom: 32, right: 32, scale: 1 }} overlay={overlay} />
    </>
  );
};

export default ARSApp;
