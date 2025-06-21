import React, { useRef, useEffect, useState } from 'react';
import ARPanel from '../ARScomponents/ARPanel';
import ARSConfig from '../ARScomponents/ARSConfig';

/**
 * ARStereoView
 * Vista AR estereoscópica reutilizable.
 * Props:
 *  - onClose: función para cerrar la vista
 *  - defaultSeparation, defaultWidth, defaultHeight: valores iniciales
 *  - overlay: componente React a superponer (ej: <VRDomo />)
 *  - floatingButtonProps: props para el botón flotante (ubicación, escala)
 */
const ARStereoView = ({
  onClose,
  defaultSeparation = 24,
  defaultWidth = 380,
  defaultHeight = 480,
  overlay,
  floatingButtonProps = { bottom: 32, right: 32, scale: 1 }
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
      {/* Botón flecha atrás para salir de ARS */}
      <button
        style={{
          position: 'absolute',
          top: 10,
          right: 12,
          zIndex: 4001,
          background: 'rgba(34,34,34,0.95)',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: 15,
          height: 15,
          fontSize: 12,
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px #000a',
        }}
        onClick={onClose}
        aria-label="Volver"
      >
        ←
      </button>
      {/* Menú de configuración ARS (incluye botón de mostrar/ocultar) */}
      <ARSConfig
        arSeparation={arSeparation} setArSeparation={setArSeparation}
        arWidth={arWidth} setArWidth={setArWidth}
        arHeight={arHeight} setArHeight={setArHeight}
        offsetL={offsetL} setOffsetL={setOffsetL}
        offsetR={offsetR} setOffsetR={setOffsetR}
        zoom={zoom} setZoom={setZoom}
        showMenu={showMenu} setShowMenu={setShowMenu}
      />
      {/* Vista izquierda */}
      <ARPanel
        videoRef={videoRefL}
        width={arWidth}
        height={arHeight}
        overlay={overlay}
        zoom={zoom}
        offset={offsetL}
        style={{ marginRight: arSeparation / 2 }}
      />
      {/* Vista derecha */}
      <ARPanel
        videoRef={videoRefR}
        width={arWidth}
        height={arHeight}
        overlay={overlay}
        zoom={zoom}
        offset={offsetR}
        style={{ marginLeft: arSeparation / 2 }}
      />
    </div>
  );
};

export default ARStereoView;
