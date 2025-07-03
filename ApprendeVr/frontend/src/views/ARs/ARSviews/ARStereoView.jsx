import React, { useRef, useEffect, useState } from 'react';
import ARPanel from '../ARScomponents/ARPanel';
import ARSConfig from '../ARScomponents/ARSConfig';
import ARSConfigStatus from '../ARScomponents/ARSConfigStatus';
import arsConfigManager from '../../../config/ARSConfigManager';

// Usar el nuevo sistema de configuración basado en archivos JSON
const getInitialConfig = (defaults) => {
  return arsConfigManager.loadConfig(defaults);
};

const detectOverlayType = (overlay) => {
  if (!overlay) return 'html';
  
  // Si es un array, determinar el tipo basado en el primer elemento
  if (Array.isArray(overlay)) {
    if (overlay.length === 0) return 'html';
    return detectOverlayType(overlay[0]);
  }
  
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
  const [showMenu, setShowMenu] = useState(() => {
    // Verificar si existe configuración personalizada
    const config = arsConfigManager.config?.userConfig;
    return !config?.customProfile;
  });
  const videoRefL = useRef(null);
  const videoRefR = useRef(null);

  // Guardar configuración en archivo JSON
  const saveConfig = async () => {
    const config = { arSeparation, arWidth, arHeight, offsetL, offsetR, zoom };
    const success = await arsConfigManager.saveConfig(config);
    if (success) {
      setShowMenu(false);
      // Mostrar feedback visual de éxito
      console.log('✅ Configuración guardada en config_Ars.json');
    } else {
      console.error('❌ Error al guardar configuración');
    }
  };

  // Función para manejar cuando se carga una nueva configuración
  const handleConfigLoaded = (newConfig) => {
    setArSeparation(newConfig.arSeparation);
    setArWidth(newConfig.arWidth);
    setArHeight(newConfig.arHeight);
    setOffsetL(newConfig.offsetL);
    setOffsetR(newConfig.offsetR);
    setZoom(newConfig.zoom);
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

  // Si hay múltiples overlays, usar 'mixed'
  const finalOverlayType = Array.isArray(overlay) && overlay.length > 1 ? 'mixed' : overlayType;

  return (
    <div className="ar-stereo-container">
      {/* Botón flecha atrás para salir de ARS - Mejorado */}
      <button
        style={{
          position: 'absolute',
          top: 3,
          right: 3,
          zIndex: 4001,
          background: 'rgba(34,34,34,0.9)',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: 18,
          height: 18,
          fontSize: 12,
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 3px 12px rgba(0,0,0,0.4)',
          transition: 'all 0.3s ease',
          lineHeight: 1,
          fontFamily: 'monospace'
        }}
        onClick={onClose}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.background = 'rgba(64,64,64,0.9)';
          e.target.style.boxShadow = '0 4px 16px rgba(0,0,0,0.6)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.background = 'rgba(34,34,34,0.9)';
          e.target.style.boxShadow = '0 3px 12px rgba(0,0,0,0.4)';
        }}
        aria-label="Volver"
        title="Volver"
      >
        ←
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
            top: 6, 
            left: 6
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
          overlayType={finalOverlayType}
          zoom={zoom}
          offset={offsetL}
        />
        {/* Vista derecha */}
        <ARPanel
          videoRef={videoRefR}
          width={arWidth}
          height={arHeight}
          overlay={overlay}
          overlayType={finalOverlayType}
          zoom={zoom}
          offset={offsetR}
        />
      </div>
      
      {/* Estado y opciones de configuración */}
      <ARSConfigStatus onConfigLoaded={handleConfigLoaded} />
    </div>
  );
};

export default ARStereoView;
