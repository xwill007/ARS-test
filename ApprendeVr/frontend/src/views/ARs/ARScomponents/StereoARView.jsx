import React, { useRef, useEffect, useState } from 'react';
import StereoARPanel from './StereoARPanel';
import ARSConfig from './ARSConfig';

/**
 * StereoARView
 * Vista AR estereoscópica reutilizable.
 * Props:
 *  - onClose: función para cerrar la vista
 *  - defaultSeparation, defaultWidth, defaultHeight: valores iniciales
 *  - overlay: componente React a superponer (ej: <VRDomo />)
 */
const StereoARView = ({
  onClose,
  defaultSeparation = 24,
  defaultWidth = 380,
  defaultHeight = 480,
  overlay
}) => {
  const [arSeparation, setArSeparation] = useState(defaultSeparation);
  const [arWidth, setArWidth] = useState(defaultWidth);
  const [arHeight, setArHeight] = useState(defaultHeight);
  const [offsetL, setOffsetL] = useState(0);
  const [offsetR, setOffsetR] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [showMenu, setShowMenu] = useState(true);
  const videoRefL = useRef(null);
  const videoRefR = useRef(null);

  useEffect(() => {
    // Pantalla completa al entrar
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
    let stream;
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
      // Salir de pantalla completa
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
      flexDirection: 'row',
    }}>
      <ARSConfig
        arSeparation={arSeparation} setArSeparation={setArSeparation}
        arWidth={arWidth} setArWidth={setArWidth}
        arHeight={arHeight} setArHeight={setArHeight}
        offsetL={offsetL} setOffsetL={setOffsetL}
        offsetR={offsetR} setOffsetR={setOffsetR}
        zoom={zoom} setZoom={setZoom}
        showMenu={showMenu} setShowMenu={setShowMenu}
      />
      {/* Botón para volver */}
      <button
        style={{
          position: 'absolute',
          top: 16,
          right: 24,
          zIndex: 3101,
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
      {/* Paneles estereoscópicos */}
      <StereoARPanel
        videoRef={videoRefL}
        width={arWidth}
        height={arHeight}
        overlay={overlay}
        style={{ marginRight: arSeparation / 2 }}
      />
      <StereoARPanel
        videoRef={videoRefR}
        width={arWidth}
        height={arHeight}
        overlay={overlay}
        style={{ marginLeft: arSeparation / 2 }}
      />
    </div>
  );
};

export default StereoARView;
