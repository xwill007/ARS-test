import React from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, Controllers, XRButton } from '@react-three/xr';

const ARStrackingView = ({ onClose }) => {
  return (
    <div
      className='container3D'
      style={{
        width: '100%',
        height: '100vh'
      }}
    >
      <Canvas>
        <XR>
          {/* Cubo visible en VR/AR */}
          <mesh position={[0, 1.5, -2]}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="orange" />
          </mesh>
          <ambientLight intensity={0.5} />
          <Controllers />
        </XR>
      </Canvas>

      {/* Botón para entrar en modo AR */}
      <XRButton
        mode="AR"
        sessionInit={{
          requiredFeatures: ['hit-test']
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

export default ARStrackingView;