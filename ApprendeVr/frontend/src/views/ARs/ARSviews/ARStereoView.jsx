import React, { useRef, useEffect, useState } from 'react';
import ARPanel from '../ARScomponents/ARPanel';
import ARSConfig from '../ARScomponents/ARSConfig';

const LOCAL_KEY = 'arsconfig-user';

// Detectar tipo de dispositivo para configuración inicial
const detectDeviceType = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
  const isTablet = /ipad|android(?!.*mobile)/.test(userAgent);
  
  if (isMobile && !isTablet) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
};

// Configuraciones predeterminadas por dispositivo
const getDeviceDefaults = () => {
  const deviceType = detectDeviceType();
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  
  switch (deviceType) {
    case 'mobile':
      return {
        arSeparation: Math.min(20, screenWidth * 0.05),
        arWidth: Math.min(320, screenWidth * 0.4),
        arHeight: Math.min(400, screenHeight * 0.6),
        offsetL: -5,
        offsetR: 5,
        zoom: 1.1
      };
    case 'tablet':
      return {
        arSeparation: Math.min(35, screenWidth * 0.06),
        arWidth: Math.min(400, screenWidth * 0.35),
        arHeight: Math.min(500, screenHeight * 0.65),
        offsetL: -8,
        offsetR: 8,
        zoom: 1.15
      };
    default: // desktop
      return {
        arSeparation: Math.min(50, screenWidth * 0.08),
        arWidth: Math.min(450, screenWidth * 0.3),
        arHeight: Math.min(550, screenHeight * 0.7),
        offsetL: -12,
        offsetR: 12,
        zoom: 1.2
      };
  }
};

function getInitialConfig(defaults) {
  try {
    const stored = localStorage.getItem(LOCAL_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Combinar con defaults del dispositivo actual
      const deviceDefaults = getDeviceDefaults();
      return { ...deviceDefaults, ...defaults, ...parsed };
    }
  } catch (e) {
    console.warn('Error loading AR config from localStorage:', e);
  }
  // Si no hay configuración guardada, usar defaults del dispositivo
  return { ...defaults, ...getDeviceDefaults() };
}

const detectOverlayType = (overlay) => {
  if (!overlay) return 'html';
  if (typeof overlay === 'string') return 'html';
  if (overlay.type) {
    // Si es un tag HTML estándar
    if (typeof overlay.type === 'string') {
      // Lista corta de tags HTML y A-Frame
      const htmlTags = [
        'div', 'span', 'a', 'p', 'img', 'button', 'input', 'form', 'a-scene', 'a-entity', 'a-box', 'a-sphere', 'a-cylinder', 'a-plane', 'a-assets'
      ];
      if (htmlTags.includes(overlay.type)) return 'html';
      // Si no es un tag HTML conocido, podría ser R3F
      return 'r3f';
    }
    // Si es un componente (función o clase), asumimos R3F por defecto
    return 'r3f';
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
    <div className="ar-stereo-container">
      {/* Botón flecha atrás para salir de ARS - Mejorado */}
      <button
        style={{
          position: 'absolute',
          top: 15,
          right: 15,
          zIndex: 4001,
          background: 'linear-gradient(135deg, rgba(244,67,54,0.9), rgba(211,47,47,0.9))',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: 22,
          height: 22,
          fontSize: 14,
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 3px 12px rgba(244,67,54,0.4)',
          transition: 'all 0.3s ease',
        }}
        onClick={onClose}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.boxShadow = '0 4px 16px rgba(244,67,54,0.6)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 3px 12px rgba(244,67,54,0.4)';
        }}
        aria-label="Cerrar Vista AR"
        title="Cerrar Vista AR"
      >
        ✕
      </button>
      {/* Menú de configuración ARS (incluye botón de mostrar/ocultar) - Posición mejorada */}
      <ARSConfig
        arSeparation={arSeparation} setArSeparation={setArSeparation}
        arWidth={arWidth} setArWidth={setArWidth}
        arHeight={arHeight} setArHeight={setArHeight}
        offsetL={offsetL} setOffsetL={setOffsetL}
        offsetR={offsetR} setOffsetR={setOffsetR}
        zoom={zoom} setZoom={setZoom}
        showMenu={showMenu} setShowMenu={setShowMenu}
        onSave={saveConfig}
        position={{
          button: { 
            top: 15, 
            left: 15
          },
          menu: { 
            top: 50, 
            left: 15,
            maxHeight: 'calc(100vh - 80px)',
            overflowY: 'auto'
          }
        }}
      />
      {/* Contenedor de los paneles AR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: arSeparation,
        height: '100%',
        width: '100%'
      }}>
        {/* Vista izquierda */}
        <ARPanel
          videoRef={videoRefL}
          width={arWidth}
          height={arHeight}
          overlay={overlay}
          overlayType={overlayType}
          zoom={zoom}
          offset={offsetL}
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
        />
      </div>
    </div>
  );
};

export default ARStereoView;
