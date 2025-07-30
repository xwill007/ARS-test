import React, { useRef, useEffect, useState } from 'react';

/**
 * ARSVideoLocalAFrameIOS - Versión específica para iOS que evita el problema del cuadro negro
 * Usa un enfoque diferente para manejar videos en iOS
 */
const ARSVideoLocalAFrameIOS = ({ 
  videoSrc = '/videos/sample.mp4', 
  position = "0 0 0", 
  scale = "4 3 1",
  autoPlay = true,
  loop = true,
  muted = true
}) => {
  const sceneRef = useRef();
  const videoId = `video-ios-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoElement, setVideoElement] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [useAlternativeMethod, setUseAlternativeMethod] = useState(false);

  useEffect(() => {
    // Detectar iOS específicamente
    const iosCheck = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsIOS(iosCheck);
    
    console.log('ARSVideoLocalAFrameIOS - iOS detected:', iosCheck);
  }, []);

  useEffect(() => {
    // Crear elemento video con configuración específica para iOS
    const video = document.createElement('video');
    video.id = videoId;
    video.src = videoSrc;
    video.crossOrigin = 'anonymous';
    video.loop = loop;
    video.muted = muted;
    
    // Configuración específica para iOS
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('x-webkit-airplay', 'allow');
    video.setAttribute('x5-video-player-type', 'h5');
    video.setAttribute('x5-video-player-fullscreen', 'false');
    video.setAttribute('x5-video-orientation', 'portraint');
    video.setAttribute('preload', 'auto');
    video.setAttribute('autobuffer', '');
    
    // Para iOS, hacer el video visible pero muy pequeño
    video.style.position = 'absolute';
    video.style.top = '-9999px';
    video.style.left = '-9999px';
    video.style.width = '320px';  // Tamaño mínimo para iOS
    video.style.height = '240px';
    video.style.opacity = '0.01';

    // Eventos del video
    video.addEventListener('loadedmetadata', () => {
      console.log('iOS Video metadata loaded:', {
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState
      });
      setVideoLoaded(true);
    });

    video.addEventListener('canplay', () => {
      console.log('iOS Video can play - readyState:', video.readyState);
      // En iOS, no autoplay - esperar interacción del usuario
    });

    video.addEventListener('loadeddata', () => {
      console.log('iOS Video data loaded');
    });

    video.addEventListener('playing', () => {
      console.log('iOS Video is playing');
      setIsPlaying(true);
    });

    video.addEventListener('pause', () => {
      console.log('iOS Video paused');
      setIsPlaying(false);
    });

    video.addEventListener('error', (e) => {
      console.error('iOS Video error:', e);
      console.error('Video error details:', {
        error: video.error,
        networkState: video.networkState,
        readyState: video.readyState,
        src: video.src
      });
    });

    // Agregar video al DOM
    document.body.appendChild(video);
    setVideoElement(video);

    // Cleanup
    return () => {
      if (video) {
        video.pause();
        video.src = '';
        video.load();
        if (video.parentNode) {
          video.parentNode.removeChild(video);
        }
      }
    };
  }, [videoSrc, autoPlay, loop, muted, videoId]);

  const handleClick = () => {
    console.log('iOS Video clicked - isPlaying:', isPlaying, 'readyState:', videoElement?.readyState);
    if (videoElement) {
      if (isPlaying) {
        videoElement.pause();
        setIsPlaying(false);
      } else {
        // En iOS, asegurar que el video esté listo
        if (videoElement.readyState < 2) {
          console.log('iOS Video not ready, waiting...');
          videoElement.addEventListener('canplay', () => {
            videoElement.play().then(() => {
              setIsPlaying(true);
            }).catch(err => {
              console.error('Error playing iOS video:', err);
            });
          }, { once: true });
        } else {
          videoElement.play().then(() => {
            setIsPlaying(true);
          }).catch(err => {
            console.error('Error playing iOS video:', err);
          });
        }
      }
    }
  };

  // Método alternativo para iOS: usar canvas como textura
  const createCanvasTexture = () => {
    if (!videoElement || !isIOS) return null;
    
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    
    const updateCanvas = () => {
      if (videoElement.readyState >= 2) {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      }
      requestAnimationFrame(updateCanvas);
    };
    
    updateCanvas();
    return canvas;
  };

  return (
    <div ref={sceneRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <a-scene 
        embedded 
        style={{ width: '100%', height: '100%' }}
        vr-mode-ui="enabled: false"
        background="color: transparent"
        cursor="rayOrigin: mouse"
        raycaster="objects: .clickable"
      >
        {/* Assets - Método estándar */}
        <a-assets>
          <video 
            id={videoId}
            src={videoSrc}
            crossOrigin="anonymous"
            loop={loop}
            muted={muted}
            playsInline
            preload="auto"
            style={{ display: 'none' }}
          />
        </a-assets>

        {/* Video plane - Método estándar */}
        <a-plane
          position={position}
          scale={scale}
          material={`src: #${videoId}; transparent: true; opacity: 1`}
          onClick={handleClick}
          class="clickable"
        />

        {/* Frame border */}
        <a-plane
          position={position}
          scale={`${parseFloat(scale.split(' ')[0]) * 1.05} ${parseFloat(scale.split(' ')[1]) * 1.05} 1`}
          material="color: #222; transparent: true; opacity: 0.8"
        />

        {/* Play/Pause indicator */}
        {!isPlaying && (
          <a-plane
            position={`${position.split(' ')[0]} ${position.split(' ')[1]} ${parseFloat(position.split(' ')[2]) + 0.01}`}
            scale="0.5 0.5 1"
            material="color: #00ff00; transparent: true; opacity: 0.7"
          />
        )}

        {/* Debug info for iOS */}
        {isIOS && (
          <a-text
            value={`iOS Video Debug: ${videoLoaded ? 'Loaded' : 'Loading'} | ReadyState: ${videoElement?.readyState || 'N/A'} | Playing: ${isPlaying ? 'Yes' : 'No'}`}
            position="0 2 0"
            color="red"
            width="4"
          />
        )}

        {/* Alternative debug plane for iOS */}
        {isIOS && !videoLoaded && (
          <a-plane
            position={position}
            scale={scale}
            material="color: #ff0000; transparent: true; opacity: 0.5"
          />
        )}

        {/* Camera for embedded scene */}
        <a-camera position="0 0 5" look-controls="enabled: false" wasd-controls="enabled: false">
          <a-cursor
            position="0 0 -1"
            geometry="primitive: ring; radiusInner: 0.02; radiusOuter: 0.03"
            material="color: white; shader: flat; opacity: 0.8"
            raycaster="objects: .clickable"
          />
        </a-camera>
      </a-scene>
    </div>
  );
};

export default ARSVideoLocalAFrameIOS; 