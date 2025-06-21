import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, OrbitControls } from '@react-three/drei';
import VRWorld from '../../components/VRWorld/VRWorld';

// Botón 3D para activar la vista AR Estéreo
const VRButton = ({ position, scale, text, onClick }) => (
  <group position={position} scale={[scale, scale, scale]}>
    <mesh onClick={onClick} castShadow receiveShadow>
      <boxGeometry args={[1.2, 0.4, 0.2]} />
      <meshStandardMaterial color={'#1e90ff'} />
    </mesh>
    <mesh position={[0, 0, 0.12]}>
      <planeGeometry args={[1.1, 0.3]} />
      <meshBasicMaterial color={'#222'} transparent opacity={0.7} />
    </mesh>
    {/* Puedes agregar texto 3D aquí si lo deseas */}
  </group>
);

// Vista AR Estéreo (idéntica a la lógica de App.jsx)
const StereoARView = ({ onClose, defaultSeparation = 24, defaultWidth = 380, defaultHeight = 480 }) => {
  const [arSeparation, setArSeparation] = useState(defaultSeparation);
  const [arWidth, setArWidth] = useState(defaultWidth);
  const [arHeight, setArHeight] = useState(defaultHeight);
  const videoRefL = useRef(null);
  const videoRefR = useRef(null);

  useEffect(() => {
    let stream;
    // Pantalla completa al entrar en modo AR estéreo
    const enterFullscreen = () => {
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
      else if (el.msRequestFullscreen) el.msRequestFullscreen();
    };
    // Solo intentar fullscreen si es por interacción de usuario
    setTimeout(() => {
      enterFullscreen();
    }, 200);
    const getCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (videoRefL.current) videoRefL.current.srcObject = stream;
        if (videoRefR.current) videoRefR.current.srcObject = stream;
      } catch (e) {
        console.error('No se pudo acceder a la cámara', e);
      }
    };
    getCamera();
    return () => {
      if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'black',
      zIndex: 3000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <button
        style={{
          position: 'absolute',
          top: 16,
          right: 24,
          zIndex: 3100,
          background: '#222',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          padding: '8px 18px',
          fontSize: 16,
          cursor: 'pointer',
          opacity: 0.85
        }}
        onClick={onClose}
      >
        Volver
      </button>
      <div style={{
        position: 'absolute',
        top: 16,
        left: 24,
        zIndex: 3100,
        background: 'rgba(30,30,30,0.95)',
        color: 'white',
        borderRadius: 8,
        padding: '10px 18px',
        fontSize: 15,
        boxShadow: '0 2px 8px #000a',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 220
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ minWidth: 80 }}>Separación</span>
          <input type="range" min="0" max="100" value={arSeparation} onChange={e => setArSeparation(Number(e.target.value))} />
          <span style={{ width: 36, textAlign: 'right' }}>{arSeparation}px</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ minWidth: 80 }}>Ancho</span>
          <input type="range" min="100" max="800" value={arWidth} onChange={e => setArWidth(Number(e.target.value))} />
          <span style={{ width: 36, textAlign: 'right' }}>{arWidth}px</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ minWidth: 80 }}>Alto</span>
          <input type="range" min="100" max="800" value={arHeight} onChange={e => setArHeight(Number(e.target.value))} />
          <span style={{ width: 36, textAlign: 'right' }}>{arHeight}px</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: arSeparation, justifyContent: 'center', alignItems: 'center' }}>
        <video ref={videoRefL} autoPlay playsInline width={arWidth} height={arHeight} style={{ borderRadius: 8, background: '#111' }} />
        <video ref={videoRefR} autoPlay playsInline width={arWidth} height={arHeight} style={{ borderRadius: 8, background: '#111' }} />
      </div>
    </div>
  );
};

const ARSApp = () => {
  const [showStereoAR, setShowStereoAR] = useState(false);
  return (
    <>
      <Canvas camera={{ position: [0, 2, 5] }}>
        <Sky sunPosition={[100, 10, 100]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <OrbitControls />
        <VRWorld diameter={10} position={[0, 0, 0]} />
        {!showStereoAR && (
          <VRButton
            position={[0, 0.8, 0]}
            scale={0.9}
            text="VR-AR STEREO"
            onClick={() => setShowStereoAR(true)}
          />
        )}
      </Canvas>
      {showStereoAR && (
        <StereoARView onClose={() => setShowStereoAR(false)} />
      )}
    </>
  );
};

export default ARSApp;
