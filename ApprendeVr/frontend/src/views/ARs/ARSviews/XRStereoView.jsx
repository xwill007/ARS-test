import React from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, Controllers, XRButton } from '@react-three/xr';

// Cubo naranja reutilizable
const StereoCube = () => (
  <mesh position={[0, 1.5, -2]}>
    <boxGeometry args={[0.5, 0.5, 0.5]} />
    <meshStandardMaterial color="orange" />
  </mesh>
);

/**
 * XRStereoView
 * Muestra la escena XR (AR) en dos paneles lado a lado para efecto estéreo.
 * Props:
 *  - onClose: función para cerrar la vista
 */
const XRStereoView = ({ onClose }) => {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#000',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 3000,
        overflow: 'hidden',
      }}
    >
      {/* Un solo Canvas XR */}
      <Canvas style={{ width: '100vw', height: '100vh' }}>
        <XR>
          <StereoCube />
          <ambientLight intensity={0.5} />
          <Controllers />
        </XR>
      </Canvas>
      {/* Overlay visual para simular dos cuadros */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          width: 2,
          height: '100%',
          background: '#2228',
          zIndex: 5,
        }}
      />
      {/* Botón para activar AR */}
      <XRButton
        mode="AR"
        sessionInit={{
          requiredFeatures: ['hit-test'],
        }}
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          padding: 12,
          background: '#0af',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
        }}
      >
        Activar AR
      </XRButton>
      <button
        style={{
          position: 'absolute',
          top: 16,
          right: 24,
          zIndex: 10,
          padding: 8,
          background: '#222',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
        }}
        onClick={onClose}
      >
        Volver
      </button>
    </div>
  );
};

export default XRStereoView;