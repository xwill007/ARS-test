import React, { useRef, useEffect, useState } from 'react';
import ARPanel from '../ARScomponents/ARPanel';
import ARSConfig from '../ARScomponents/ARSConfig';
import ARSConfigStatus from '../ARScomponents/ARSConfigStatus';
import CuboRotatorio from '../ARScomponents/overlays/CuboRotatorio';
import arsConfigManager from '../../../config/ARSConfigManager';
import html2canvas from 'html2canvas';

// Usar el nuevo sistema de configuración basado en archivos JSON
const getInitialConfig = (defaults) => {
  console.log('📥 Obteniendo configuración inicial con defaults:', defaults);
  
  try {
    const config = arsConfigManager?.loadConfig ? arsConfigManager.loadConfig(defaults) : defaults;
    console.log('🔧 Configuración inicial cargada:', config);
    
    // Asegurar que cameraResolution siempre esté presente
    if (!config.cameraResolution) {
      console.log('⚠️ cameraResolution no encontrada, usando 720p por defecto');
      config.cameraResolution = '720p';
    }
    
    return config;
  } catch (error) {
    console.warn('⚠️ Error cargando configuración, usando defaults:', error);
    return {
      ...defaults,
      cameraResolution: '720p'
    };
  }
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
 *  - overlayConfig: configuración de overlays seleccionados (opcional)
 */
const ARStereoView = ({
  onClose,
  defaultSeparation = 24,
  defaultWidth = 380,
  defaultHeight = 480,
  overlay = null,
  overlayType: overlayTypeProp,
  overlayConfig = null,
  floatingButtonProps = { bottom: 32, right: 32, scale: 1 }
}) => {
  const initial = getInitialConfig({
    arSeparation: defaultSeparation,
    arWidth: defaultWidth,
    arHeight: defaultHeight,
    offsetL: 0,
    offsetR: 0,
    zoom: 1,
    cameraZoom: 1,
    cameraResolution: '720p',
    // Nuevas opciones de optimización
    optimizeStereo: false,
    mirrorRightPanel: false,
    muteRightPanel: true,
    singleCursor: false,
    // Nueva opción: modo lado a lado forzado
    forceSideBySide: false,
    showTestCube: false
  });
  const [arSeparation, setArSeparation] = useState(initial.arSeparation);
  const [arWidth, setArWidth] = useState(initial.arWidth);
  const [arHeight, setArHeight] = useState(initial.arHeight);
  const [offsetL, setOffsetL] = useState(initial.offsetL);
  const [offsetR, setOffsetR] = useState(initial.offsetR);
  const [zoom, setZoom] = useState(initial.zoom);
  const [cameraZoom, setCameraZoom] = useState(initial.cameraZoom || 1);
  const [cameraResolution, setCameraResolution] = useState(initial.cameraResolution || '720p'); // Resolución por defecto
  
  // Nuevos estados para optimización estereoscópica
  const [optimizeStereo, setOptimizeStereo] = useState(initial.optimizeStereo || false);
  const [mirrorRightPanel, setMirrorRightPanel] = useState(initial.mirrorRightPanel || false);
  const [muteRightPanel, setMuteRightPanel] = useState(initial.muteRightPanel || true);
  const [singleCursor, setSingleCursor] = useState(initial.singleCursor !== undefined ? initial.singleCursor : false);
  // Nuevos estados para modo lado a lado y cubo de prueba
  const [forceSideBySide, setForceSideBySide] = useState(initial.forceSideBySide || false);
  const [showTestCube, setShowTestCube] = useState(initial.showTestCube || false);
  // Solo mostrar el menú si no hay configuración previa
  const [showMenu, setShowMenu] = useState(() => {
    try {
      // Verificar si existe configuración personalizada
      const config = arsConfigManager?.config?.userConfig;
      return !config?.customProfile;
    } catch (error) {
      console.warn('⚠️ Error verificando configuración para menú:', error);
      return true; // Mostrar menú por defecto si hay error
    }
  });
  const videoRefL = useRef(null);
  const videoRefR = useRef(null);
  const streamRef = useRef(null);
  const leftPanelRef = useRef(null);
  const rightCanvasRef = useRef(null);

  // Función para obtener las dimensiones de la resolución
  const getResolutionDimensions = (resolution) => {
    const resolutions = {
      '480p': { width: 640, height: 480 },
      '720p': { width: 1280, height: 720 },
      '1080p': { width: 1920, height: 1080 },
      '4K': { width: 3840, height: 2160 }
    };
    return resolutions[resolution] || resolutions['720p'];
  };

  // Función para inicializar la cámara con una resolución específica
  const initializeCamera = async (resolution = '720p', zoomLevel = 1) => {
    try {
      // Detener stream anterior si existe
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const dimensions = getResolutionDimensions(resolution);
      const constraints = {
        video: { 
          facingMode: 'environment',
          width: { ideal: dimensions.width },
          height: { ideal: dimensions.height },
          zoom: { ideal: zoomLevel }
        }, 
        audio: false
      };

      console.log(`🎥 Iniciando cámara con resolución ${resolution} y zoom ${zoomLevel}x:`, dimensions);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRefL.current) videoRefL.current.srcObject = stream;
      if (videoRefR.current) videoRefR.current.srcObject = stream;
      
      console.log(`✅ Cámara inicializada con resolución ${resolution}`);
    } catch (e) {
      console.error(`❌ Error al acceder a la cámara con resolución ${resolution}:`, e);
      // Fallback a resolución más baja si falla
      if (resolution !== '480p') {
        console.log('🔄 Intentando con resolución 480p...');
        await initializeCamera('480p');
      }
    }
  };

  // Función para manejar el cambio de resolución
  const handleCameraResolutionChange = async (newResolution) => {
    console.log(`🔧 Cambiando resolución de cámara a: ${newResolution}`);
    await initializeCamera(newResolution);
  };

  // Función de debugging para verificar el estado actual
  const debugCurrentConfig = () => {
    console.log('🔍 Estado actual de la configuración:');
    console.log('📹 Camera Resolution:', cameraResolution);
    console.log('📐 AR Separation:', arSeparation);
    console.log('📏 AR Width:', arWidth);
    console.log('📐 AR Height:', arHeight);
    console.log('⬅️ Offset L:', offsetL);
    console.log('➡️ Offset R:', offsetR);
    console.log('🔍 Zoom (Escala):', zoom);
    console.log('📷 Zoom Cámara:', cameraZoom);
    
    // Verificar localStorage
    const persistent = localStorage.getItem('arsconfig-persistent');
    if (persistent) {
      console.log('💾 Configuración persistente en localStorage:', JSON.parse(persistent));
    } else {
      console.log('❌ No hay configuración persistente en localStorage');
    }
  };

  // Guardar configuración en archivo JSON
  const saveConfig = async () => {
    const config = { 
      arSeparation, 
      arWidth, 
      arHeight, 
      offsetL, 
      offsetR, 
      zoom, 
      cameraZoom,
      cameraResolution,
      // Nuevas opciones de optimización
      optimizeStereo,
      mirrorRightPanel,
      muteRightPanel,
      singleCursor,
      // Nuevas opciones
      forceSideBySide,
      showTestCube
    };
    console.log('💾 Guardando configuración:', config);
    
    try {
      const success = arsConfigManager?.saveConfig ? await arsConfigManager.saveConfig(config) : false;
      if (success) {
        setShowMenu(false);
        // Mostrar feedback visual de éxito
        console.log('✅ Configuración guardada en config_Ars.json');
        // Debug después de guardar
        setTimeout(() => {
          debugCurrentConfig();
        }, 100);
      } else {
        console.error('❌ Error al guardar configuración - arsConfigManager no disponible');
      }
    } catch (error) {
      console.error('❌ Error al guardar configuración:', error);
    }
  };

  // Función para manejar cuando se carga una nueva configuración
  const handleConfigLoaded = (newConfig) => {
    console.log('📂 Cargando nueva configuración:', newConfig);
    
    setArSeparation(newConfig.arSeparation);
    setArWidth(newConfig.arWidth);
    setArHeight(newConfig.arHeight);
    setOffsetL(newConfig.offsetL);
    setOffsetR(newConfig.offsetR);
    setZoom(newConfig.zoom);
    setCameraZoom(newConfig.cameraZoom || 1);
    setCameraResolution(newConfig.cameraResolution || '720p'); // Resolución por defecto
    
    // Nuevas opciones de optimización
    setOptimizeStereo(newConfig.optimizeStereo || false);
    setMirrorRightPanel(newConfig.mirrorRightPanel || false);
    setMuteRightPanel(newConfig.muteRightPanel !== undefined ? newConfig.muteRightPanel : true);
    
    // Actualizar resolución de cámara si está en la configuración
    if (newConfig.cameraResolution) {
      console.log(`📹 Actualizando resolución de cámara a: ${newConfig.cameraResolution}`);
      setCameraResolution(newConfig.cameraResolution);
      initializeCamera(newConfig.cameraResolution, newConfig.cameraZoom || 1);
    } else {
      console.log('⚠️ Nueva configuración no incluye cameraResolution');
    }
    
    // Actualizar zoom de cámara si está en la configuración
    if (newConfig.cameraZoom) {
      console.log(`🔍 Actualizando zoom de cámara a: ${newConfig.cameraZoom}x`);
      applyCameraZoom(newConfig.cameraZoom);
    }
    
    // Log de optimización
    if (newConfig.optimizeStereo) {
      console.log('⚡ Modo optimización estereoscópica activado:');
      console.log('  🪞 Espejo panel derecho:', newConfig.mirrorRightPanel);
      console.log('  🔇 Silenciar panel derecho:', newConfig.muteRightPanel);
    }
  };

  // Función para aplicar zoom de cámara en tiempo real
  const applyCameraZoom = async (zoomLevel) => {
    try {
      if (streamRef.current) {
        const videoTrack = streamRef.current.getVideoTracks()[0];
        if (videoTrack && videoTrack.getCapabilities && videoTrack.applyConstraints) {
          const capabilities = videoTrack.getCapabilities();
          
          // Verificar si el dispositivo soporta zoom
          if (capabilities.zoom) {
            const constraints = {
              zoom: {
                ideal: Math.min(Math.max(zoomLevel, capabilities.zoom.min), capabilities.zoom.max)
              }
            };
            
            await videoTrack.applyConstraints(constraints);
            console.log(`✅ Zoom de cámara aplicado: ${zoomLevel}x`);
          } else {
            console.log('⚠️ El dispositivo no soporta zoom de cámara nativo');
            // Fallback: aplicar zoom visual en el elemento video
            if (videoRefL.current) {
              videoRefL.current.style.transform = `scale(${zoomLevel})`;
            }
            if (videoRefR.current) {
              videoRefR.current.style.transform = `scale(${zoomLevel})`;
            }
            console.log(`✅ Zoom visual aplicado: ${zoomLevel}x`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error aplicando zoom de cámara:', error);
    }
  };

  useEffect(() => {
    console.log('🎬 Iniciando ARStereoView con resolución:', cameraResolution);
    
    // Debug de configuración inicial
    debugCurrentConfig();
    
    // Pantalla completa al entrar
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
    
    return () => {
      // Salir de pantalla completa
      if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
      }
      // Detener stream de cámara
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Remover dependencia de cameraResolution
  
  // useEffect separado para manejar cambios de resolución
  useEffect(() => {
    console.log('📹 Cambio de resolución detectado:', cameraResolution);
    // Inicializar cámara con la resolución actual
    initializeCamera(cameraResolution);
  }, [cameraResolution]);

  // Efecto para aplicar zoom de cámara cuando cambia
  useEffect(() => {
    if (cameraZoom && cameraZoom !== 1) {
      applyCameraZoom(cameraZoom);
    }
  }, [cameraZoom]);

  // Determinar overlayType automáticamente si no se pasa
  const overlayType = overlayTypeProp || detectOverlayType(overlay);

  // Si hay múltiples overlays, usar 'mixed'
  const finalOverlayType = Array.isArray(overlay) && overlay.length > 1 ? 'mixed' : overlayType;

  // Crear overlay combinado con cubo de prueba si está habilitado
  const combinedOverlay = React.useMemo(() => {
    if (!showTestCube && !overlay) return null;
    
    const overlays = [];
    
    // Agregar overlay original si existe
    if (overlay) {
      if (Array.isArray(overlay)) {
        overlays.push(...overlay);
      } else {
        overlays.push(overlay);
      }
    }
    
    // Agregar cubo de prueba si está habilitado
    if (showTestCube) {
      try {
        overlays.push(
          React.createElement(CuboRotatorio, {
            key: 'test-cube',
            size: 60, // ✅ Tamaño optimizado para visibilidad completa
            position: { x: 0, y: 0 }, // ✅ Centrado en el viewport
            speed: 0.3, // ✅ Velocidad más suave para mejor captura
            showLabel: true
          })
        );
      } catch (error) {
        console.warn('Error creando cubo rotatorio:', error);
      }
    }
    
    return overlays.length === 0 ? null : 
           overlays.length === 1 ? overlays[0] : overlays;
  }, [overlay, showTestCube]);

  // Determinar si mostrar ambos paneles - LÓGICA SIMPLIFICADA
  const shouldShowBothPanels = React.useMemo(() => {
    // Si forceSideBySide está activo, SIEMPRE mostrar ambos paneles
    if (forceSideBySide) {
      console.log('🔧 [shouldShowBothPanels] forceSideBySide activo - MOSTRANDO AMBOS PANELES');
      return true;
    }
    
    // Si optimizeStereo está inactivo, mostrar ambos paneles normalmente
    if (!optimizeStereo) {
      console.log('🔧 [shouldShowBothPanels] optimizeStereo inactivo - MOSTRANDO AMBOS PANELES');
      return true;
    }
    
    // Si optimizeStereo está activo pero mirrorRightPanel está inactivo, mostrar ambos
    if (optimizeStereo && !mirrorRightPanel) {
      console.log('🔧 [shouldShowBothPanels] optimizeStereo activo pero sin espejo - MOSTRANDO AMBOS PANELES');
      return true;
    }
    
    // Si optimizeStereo está activo Y mirrorRightPanel está activo, usar espejo
    console.log('🔧 [shouldShowBothPanels] optimizeStereo + mirrorRightPanel activos - USANDO ESPEJO');
    return true; // Siempre mostrar, pero uno será espejo
  }, [forceSideBySide, optimizeStereo, mirrorRightPanel]);

  // Debug log para diagnosticar problemas de visualización
  console.log('🔍 [ARStereoView] Debug visualización paneles:', {
    forceSideBySide,
    optimizeStereo,
    mirrorRightPanel,
    shouldShowBothPanels,
    arWidth,
    arSeparation,
    'Ancho contenedor': shouldShowBothPanels ? (arWidth * 2 + arSeparation) : arWidth,
    formula: `${forceSideBySide} || (${optimizeStereo} && !${mirrorRightPanel}) || (!${optimizeStereo})`
  });

  // Log específico para renderizado
  console.log('🎨 [ARStereoView] Renderizando paneles:', {
    'Panel izquierdo': 'SIEMPRE',
    'Panel derecho': shouldShowBothPanels ? 'SÍ' : 'NO',
    'Tipo panel derecho': (mirrorRightPanel && optimizeStereo && !forceSideBySide) ? 'ESPEJO' : 'NORMAL'
  });

  // Detectar si el overlay actual tiene cursor
  const hasOverlayCursor = React.useMemo(() => {
    const checkOverlayForCursor = (singleOverlay) => {
      if (!singleOverlay) return false;
      // VRLocalVideoOverlay tiene cursor A-Frame
      if (singleOverlay.type?.name === 'VRLocalVideoOverlay') return true;
      // Otros overlays que podrían tener cursor...
      return false;
    };
    
    if (Array.isArray(combinedOverlay)) {
      return combinedOverlay.some(checkOverlayForCursor);
    }
    
    return checkOverlayForCursor(combinedOverlay);
  }, [combinedOverlay]);

  // Lógica de cursor simplificada
  // singleCursor ahora controla si se muestran los cursores blancos en ambos paneles o en ninguno
  const showWhiteCursors = !singleCursor; // Cuando singleCursor es false, mostrar cursores blancos en ambos

  console.log('🎯 [ARStereoView] Lógica de cursor simplificada:', {
    singleCursor,
    showWhiteCursors,
    overlayType: finalOverlayType
  });

  console.log('🪞 [ARStereoView] Estado del modo espejo:', {
    optimizeStereo,
    mirrorRightPanel,
    muteRightPanel,
    'Panel derecho muestra overlay': !!overlay,
    'Panel derecho showOverlayCursor': showWhiteCursors && !(optimizeStereo && mirrorRightPanel)
  });

  console.log('🎯 [ARStereoView] Estado final antes del render:', {
    forceSideBySide,
    optimizeStereo,
    mirrorRightPanel,
    shouldShowBothPanels,
    'Mostrará panel espejo': mirrorRightPanel && optimizeStereo && !forceSideBySide,
    'Mostrará panel normal': !(mirrorRightPanel && optimizeStereo && !forceSideBySide)
  });

  // Sistema de captura del panel derecho - SIEMPRE captura el panel izquierdo completo
  useEffect(() => {
    if (shouldShowBothPanels) {
      console.log('📸 Iniciando captura continua del panel izquierdo completo (video + overlays)...');
      
      let isCapturing = false;
      
      const captureCompletePanel = async () => {
        if (isCapturing || !leftPanelRef.current || !rightCanvasRef.current) return;
        
        isCapturing = true;
        try {
          const canvas = rightCanvasRef.current;
          const ctx = canvas.getContext('2d');
          
          // Capturar todo el panel izquierdo como imagen
          const capturedCanvas = await html2canvas(leftPanelRef.current, {
            allowTaint: true,
            useCORS: true,
            scale: 0.75, // ✅ Optimizado para mejor rendimiento
            width: arWidth,
            height: arHeight,
            backgroundColor: null,
            logging: false,
            removeContainer: true,
            foreignObjectRendering: false
          });
          
          // Limpiar el canvas derecho
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // ✅ NUEVO: Implementar object-fit: cover para espejo perfecto
          const sourceWidth = capturedCanvas.width;
          const sourceHeight = capturedCanvas.height;
          const targetWidth = canvas.width;
          const targetHeight = canvas.height;
          
          const sourceAspect = sourceWidth / sourceHeight;
          const targetAspect = targetWidth / targetHeight;
          
          let drawX = 0, drawY = 0, drawWidth = targetWidth, drawHeight = targetHeight;
          let sourceX = 0, sourceY = 0, useSourceWidth = sourceWidth, useSourceHeight = sourceHeight;
          
          if (sourceAspect > targetAspect) {
            // Imagen más ancha - recortar los lados
            useSourceWidth = sourceHeight * targetAspect;
            sourceX = (sourceWidth - useSourceWidth) / 2;
          } else {
            // Imagen más alta - recortar arriba y abajo
            useSourceHeight = sourceWidth / targetAspect;
            sourceY = (sourceHeight - useSourceHeight) / 2;
          }
          
          // Dibujar con object-fit: cover
          ctx.drawImage(
            capturedCanvas,
            sourceX, sourceY, useSourceWidth, useSourceHeight,
            drawX, drawY, drawWidth, drawHeight
          );
          
        } catch (error) {
          console.warn('Error capturando panel completo:', error);
          // Fallback al método de video con object-fit: cover
          const canvas = rightCanvasRef.current;
          const video = videoRefL.current;
          const ctx = canvas.getContext('2d');
          
          if (video && video.readyState >= 2) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const videoWidth = video.videoWidth;
            const videoHeight = video.videoHeight;
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            
            const videoAspect = videoWidth / videoHeight;
            const canvasAspect = canvasWidth / canvasHeight;
            
            let sourceX = 0, sourceY = 0, sourceWidth = videoWidth, sourceHeight = videoHeight;
            
            // ✅ Object-fit: cover para video fallback
            if (videoAspect > canvasAspect) {
              // Video más ancho - cortar los lados del video
              sourceWidth = videoHeight * canvasAspect;
              sourceX = (videoWidth - sourceWidth) / 2;
            } else {
              // Video más alto - cortar arriba y abajo del video
              sourceHeight = videoWidth / canvasAspect;
              sourceY = (videoHeight - sourceHeight) / 2;
            }
            
            ctx.drawImage(
              video,
              sourceX, sourceY, sourceWidth, sourceHeight,
              0, 0, canvasWidth, canvasHeight
            );
            
            // Mensaje de fallback optimizado
            ctx.fillStyle = 'rgba(255, 193, 7, 0.8)';
            ctx.fillRect(8, canvas.height - 28, 180, 20);
            ctx.fillStyle = '#000';
            ctx.font = 'bold 9px Arial';
            ctx.fillText('⚠️ Solo video (optimizado)', 12, canvas.height - 16);
          }
        }
        
        isCapturing = false;
      };
      
      // Captura inicial más rápida
      setTimeout(captureCompletePanel, 300); // ✅ Reducido de 500ms
      
      // ✅ Framerate optimizado para fluidez y rendimiento
      const interval = setInterval(captureCompletePanel, 1000 / 30); // ✅ 30fps para mejor fluidez
      
      return () => {
        clearInterval(interval);
        console.log('📸 Captura del panel derecho detenida');
      };
    }
  }, [shouldShowBothPanels, arWidth, arHeight, combinedOverlay]);

  return (
    <div className="ar-stereo-container">
      {/* Indicador de optimización activa */}
      {optimizeStereo && (
        <div style={{
          position: 'absolute',
          top: 50,
          right: 10,
          zIndex: 4000,
          background: 'rgba(76, 175, 80, 0.9)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 'bold',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          ⚡ Modo Optimizado
          <div style={{ fontSize: '10px', opacity: 0.9 }}>
            {mirrorRightPanel && '🪞'} {muteRightPanel && '🔇'}
          </div>
        </div>
      )}
      
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
        scale={zoom} setScale={setZoom}
        cameraZoom={cameraZoom} setCameraZoom={setCameraZoom}
        cameraResolution={cameraResolution} setCameraResolution={setCameraResolution}
        onCameraResolutionChange={handleCameraResolutionChange}
        showMenu={showMenu} setShowMenu={setShowMenu}
        onSave={saveConfig}
        // Nuevas props para optimización estereoscópica
        optimizeStereo={optimizeStereo} setOptimizeStereo={setOptimizeStereo}
        mirrorRightPanel={mirrorRightPanel} setMirrorRightPanel={setMirrorRightPanel}
        muteRightPanel={muteRightPanel} setMuteRightPanel={setMuteRightPanel}
        singleCursor={singleCursor} setSingleCursor={setSingleCursor}
        // Nuevas props para modo lado a lado y cubo de prueba
        forceSideBySide={forceSideBySide} setForceSideBySide={setForceSideBySide}
        showTestCube={showTestCube} setShowTestCube={setShowTestCube}
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
        width: shouldShowBothPanels ? (arWidth * 2 + arSeparation) : arWidth,
        maxWidth: '100vw',
        margin: '0 auto'
      }}>
        {/* Vista izquierda (principal) */}
        <div ref={leftPanelRef} style={{
          width: arWidth, 
          height: arHeight, 
          flexShrink: 0, 
          flexGrow: 0,
          position: 'relative',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          {/* Indicador de panel izquierdo - solo en modo debug */}
          {shouldShowBothPanels && forceSideBySide && (
            <div style={{
              position: 'absolute',
              top: 8,
              left: 8,
              background: 'rgba(76, 175, 80, 0.8)',
              color: 'white',
              padding: '3px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 'bold',
              zIndex: 15,
              pointerEvents: 'none'
            }}>
              L
            </div>
          )}
          <ARPanel
            videoRef={videoRefL}
            width={arWidth}
            height={arHeight}
            overlay={combinedOverlay}
            overlayType={finalOverlayType}
            zoom={zoom}
            cameraZoom={cameraZoom}
            offset={offsetL}
            isPrimaryPanel={true}
            showCursor={false}
            showOverlayCursor={showWhiteCursors}
            optimizationSettings={{
              optimizeStereo,
              mirrorRightPanel,
              muteRightPanel,
              singleCursor,
              forceSideBySide,
              showTestCube
            }}
          />
        </div>
        {/* Vista derecha (secundaria/optimizada/espejo) - SIEMPRE MOSTRAR CUANDO shouldShowBothPanels = true */}
        {shouldShowBothPanels && (
          <div style={{
            width: arWidth, 
            height: arHeight, 
            position: 'relative',
            flexShrink: 0, 
            flexGrow: 0,
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            {/* Indicador de panel derecho - solo en modo debug */}
            {forceSideBySide && (
              <div style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'rgba(255, 87, 34, 0.8)',
                color: 'white',
                padding: '3px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 'bold',
                zIndex: 15,
                pointerEvents: 'none'
              }}>
                R
              </div>
            )}
            {/* Panel derecho SIEMPRE es canvas con captura del panel izquierdo */}
            <canvas
              ref={rightCanvasRef}
              width={arWidth}
              height={arHeight}
              style={{
                width: arWidth, 
                height: arHeight, 
                background: 'black', 
                borderRadius: 8,
                display: 'block'
              }}
            />
            {/* Indicador de panel derecho */}
            <div style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              background: (mirrorRightPanel && optimizeStereo && !forceSideBySide) 
                ? 'rgba(76, 175, 80, 0.9)' 
                : 'rgba(33, 150, 243, 0.9)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 'bold',
              zIndex: 10,
              pointerEvents: 'none'
            }}>
              {(mirrorRightPanel && optimizeStereo && !forceSideBySide) 
                ? '🪞 ESPEJO' 
                : '📺 COPIA'}
            </div>
          </div>
        )}
      </div>
      
      {/* Estado y opciones de configuración */}
      <ARSConfigStatus onConfigLoaded={handleConfigLoaded} />
    </div>
  );
};

export default ARStereoView;
