import React, { useRef, useEffect, useState } from 'react';
import ARPanel from '../ARScomponents/ARPanel';
import ARSConfig from '../ARScomponents/ARSConfig';

const LOCAL_KEY = 'arsconfig-user';

function getInitialConfig(defaults) {
  try {
    const stored = localStorage.getItem(LOCAL_KEY);
    if (stored) {
      return { ...defaults, ...JSON.parse(stored) };
    }
  } catch (e) {}
  return defaults;
}

const detectOverlayType = (overlay) => {
  if (!overlay) return 'html';
  // Si es un string, es HTML
  if (typeof overlay === 'string') return 'html';
  // Si es un React element
  if (overlay.type) {
    const typeName = typeof overlay.type === 'string' ? overlay.type : overlay.type.name;
    // Heurística: si es mesh, group, etc. => R3F
    if ([
      'mesh', 'group', 'instancedMesh', 'points', 'line', 'lineSegments', 'primitive'
    ].includes(typeName)) return 'r3f';
    // Si es un div, a-scene, span, etc. => HTML/A-Frame
    if ([
      'div', 'span', 'a-scene', 'a-entity', 'a-box', 'a-sphere', 'a-cylinder', 'a-plane', 'a-assets'
    ].includes(typeName)) return 'html';
    // Si el nombre contiene VRWorld, VRGirl, etc. => R3F
    if (typeName && /VRWorld|VRGirl|TestR3FOverlay|MyReactOverlay/i.test(typeName)) return 'r3f';
    // Si el nombre contiene VRDomo, VRVideo, etc. => HTML/A-Frame
    if (typeName && /VRDomo|VRVideo|TestHtmlOverlay/i.test(typeName)) return 'html';
  }
  // Por defecto, html
  return 'html';
};

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
  overlay = null,
  overlayType: overlayTypeProp,
  floatingButtonProps = { bottom: 32, right: 32, scale: 1 }
}) => {
  const initial = getInitialConfig({
    arSeparation: defaultSeparation,
    arWidth: defaultWidth,
    arHeight: defaultHeight,
    offsetL: 0,
    offsetR: 0,
    zoom: 1
  });
  const [arSeparation, setArSeparation] = useState(initial.arSeparation);
  const [arWidth, setArWidth] = useState(initial.arWidth);
  const [arHeight, setArHeight] = useState(initial.arHeight);
  const [offsetL, setOffsetL] = useState(initial.offsetL);
  const [offsetR, setOffsetR] = useState(initial.offsetR);
  const [zoom, setZoom] = useState(initial.zoom);
  // Solo mostrar el menú si no hay configuración previa
  const [showMenu, setShowMenu] = useState(() => !localStorage.getItem(LOCAL_KEY));
  const videoRefL = useRef(null);
  const videoRefR = useRef(null);

  // Guardar configuración en localStorage y cerrar menú
  const saveConfig = () => {
    const config = { arSeparation, arWidth, arHeight, offsetL, offsetR, zoom };
    localStorage.setItem(LOCAL_KEY, JSON.stringify(config));
    setShowMenu(false);
  };

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

  // Determinar overlayType automáticamente si no se pasa
  const overlayType = overlayTypeProp || detectOverlayType(overlay);

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
        onSave={saveConfig}
      />
      {/* Vista izquierda */}
      <ARPanel
        videoRef={videoRefL}
        width={arWidth}
        height={arHeight}
        overlay={overlay}
        overlayType={overlayType}
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
        overlayType={overlayType}
        zoom={zoom}
        offset={offsetR}
        style={{ marginLeft: arSeparation / 2 }}
      />
    </div>
  );
};

export default ARStereoView;
