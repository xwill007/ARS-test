import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * SimpleTextOverlay mejorado con video de YouTube
 * Incluye texto y video para demostrar funcionalidad completa
 * Versión optimizada para contexto ARS estéreo
 */
const SimpleTextOverlay = ({ 
  position = [0, 3, -2], 
  text = "¡Hola Mundo AR!",
  showVideo = true,
  videoId = "uVFw1Et8NFM", // Mismo video que mobile.html
  videoPosition = [0, 0, -2],
  videoWidth = 3,
  debugMode = false
}) => {
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isARSMode, setIsARSMode] = useState(false);
  const [isStereoMode, setIsStereoMode] = useState(false);
  const videoRef = useRef(null);

  // Detectar iOS, móvil, modo ARS y estéreo
  useEffect(() => {
    const iosCheck = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const mobileCheck = /iPhone|iPad|iPod|Android|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Detectar si estamos en modo ARS
    const arsCheck = document.querySelector('.ars-container') !== null || 
                    document.querySelector('.ar-panel') !== null ||
                    document.querySelector('.ar-stereo-container') !== null ||
                    window.location.href.includes('ARs');
    
    // Detectar si estamos en modo estéreo (buscar contenedor de paneles ARS)
    const stereoCheck = document.querySelector('.ar-stereo-container') !== null;
    
    setIsIOS(iosCheck);
    setIsMobile(mobileCheck);
    setIsARSMode(arsCheck);
    setIsStereoMode(stereoCheck);
    
    console.log('SimpleTextOverlay - Detected:', { 
      isIOS, 
      isMobile, 
      isARSMode,
      isStereoMode,
      videoId 
    });
  }, [videoId]);

  // Crear iframe de video directamente en el DOM
  useEffect(() => {
    if (!showVideo || !videoId) return;

    // Limpiar contenedores existentes
    const existingVideos = document.querySelectorAll(`[id^="video-overlay-${videoId}"]`);
    existingVideos.forEach(video => {
      try {
        video.remove();
      } catch (e) {
        console.log('Error removing existing video container:', e);
      }
    });

    // En modo estéreo, crear video en cada panel
    if (isStereoMode) {
      // Buscar los paneles ARS específicos
      const arsContainer = document.querySelector('.ar-stereo-container');
      if (arsContainer) {
        // Buscar TODOS los divs dentro del contenedor (menos restrictivo)
        const allDivs = arsContainer.querySelectorAll('div');
        const panelsNodeList = Array.from(allDivs);
        console.log('Todos los divs encontrados:', panelsNodeList.length);
        
        // Crear videos en los primeros 3 divs (o más si es necesario)
        panelsNodeList.slice(0, 3).forEach((panel, index) => {
          createVideoInContainer(panel, videoId, `panel-${index}`);
        });
      }
    } else {
      // En modo normal, crear en el contenedor principal
      let targetContainer = document.body;
      if (isARSMode) {
        const arsContainer = document.querySelector('.ars-container') || 
                            document.querySelector('.ar-panel') ||
                            document.querySelector('#root');
        if (arsContainer) {
          targetContainer = arsContainer;
        }
      }
      createVideoInContainer(targetContainer, videoId, 'center');
    }

    // Cleanup
    return () => {
      const existingVideos = document.querySelectorAll(`[id^="video-overlay-${videoId}"]`);
      existingVideos.forEach(video => {
        try {
          video.remove();
        } catch (e) {
          console.log('Error removing video container in cleanup:', e);
        }
      });
    };
  }, [showVideo, videoId, isARSMode, isStereoMode]);

  // Función para crear video en un contenedor específico
  const createVideoInContainer = (container, videoId, position) => {
    const videoContainer = document.createElement('div');
    videoContainer.id = `video-overlay-${videoId}-${position}`;
    videoContainer.style.position = 'absolute';
    videoContainer.style.top = '50%';
    videoContainer.style.left = '50%';
    videoContainer.style.transform = 'translate(-50%, -50%)';
    videoContainer.style.zIndex = '1000';
    videoContainer.style.pointerEvents = 'auto';
    videoContainer.style.border = '2px solid #333';
    videoContainer.style.borderRadius = '8px';
    videoContainer.style.backgroundColor = '#000';

    // Ajustar estilo según el modo
    if (isARSMode) {
      videoContainer.style.zIndex = '9999';
      videoContainer.style.width = '200px';
      videoContainer.style.height = '113px';
      videoContainer.style.border = '3px solid #ff6b6b';
      videoContainer.style.boxShadow = '0 0 20px rgba(255, 107, 107, 0.5)';
    } else {
      videoContainer.style.width = '400px';
      videoContainer.style.height = '225px';
    }

    // Crear iframe
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=1&playsinline=1&origin=${window.location.origin}`;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.frameBorder = '0';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '6px';

    videoContainer.appendChild(iframe);
    container.appendChild(videoContainer);

    console.log(`Video container created in ${position}:`, container.className || container.tagName, 'Container style:', container.style.cssText);
  };

  // Componente de video simplificado que funciona en todas las plataformas
  const VideoComponent = () => {
    const height = videoWidth * 0.5625; // Aspect ratio 16:9
    
    return (
      <group position={videoPosition}>
        <mesh>
          <planeGeometry args={[videoWidth, height]} />
          <meshBasicMaterial 
            color={isARSMode ? "#ff6b6b" : "#333333"} 
            side={THREE.DoubleSide} 
          />
        </mesh>
      </group>
    );
  };

  // Componente de texto usando geometría 3D simple
  const TextComponent = () => (
    <group position={position}>
      {/* Fondo del texto */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[text.length * 0.3, 0.4]} />
        <meshBasicMaterial color="#000000" opacity={0.7} transparent />
      </mesh>
    </group>
  );

  // Componente de debug usando geometría 3D
  const DebugComponent = () => (
    <group position={[position[0], position[1] - 1, position[2]]}>
      {/* Indicador de plataforma */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[1, 0.3]} />
        <meshBasicMaterial 
          color={isIOS ? "#ff6b6b" : isARSMode ? "#4ecdc4" : "#4ecdc4"} 
          opacity={0.8} 
          transparent 
        />
      </mesh>
    </group>
  );

  return (
    <group>
      {/* Texto principal */}
      <TextComponent />

      {/* Video de YouTube - solo si showVideo es true */}
      {showVideo && <VideoComponent />}

      {/* Indicador de plataforma para debug */}
      {(isIOS || isMobile || isARSMode) && <DebugComponent />}
    </group>
  );
};

// Versión de debug del overlay
const SimpleTextOverlayDebug = (props) => {
  return <SimpleTextOverlay {...props} debugMode={true} />;
};

export default SimpleTextOverlay;
export { SimpleTextOverlayDebug };
