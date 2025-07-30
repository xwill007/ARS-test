import React, { useRef, useEffect, useState } from 'react';

/**
 * ARSConeAFrameVideoOverlay - Componente único: video local + ejemplo de cono de palabras
 */
const ARSConeAFrameVideoOverlay = ({
  videoSrc = '/videos/sample.mp4',
  position = "0 0 0",
  scale = "4 3 1",
  autoPlay = true,
  loop = true,
  muted = true
}) => {
  const sceneRef = useRef();
  const videoId = 'video-combinado-unique';
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoElement, setVideoElement] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    // Detectar si es dispositivo móvil
    const mobileCheck = /iPhone|iPad|iPod|Android|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const iosCheck = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsMobile(mobileCheck);
    setIsIOS(iosCheck);
    
    console.log('ARSConeAFrameVideoOverlay - Detected mobile:', mobileCheck, 'iOS:', iosCheck);
  }, []);

  useEffect(() => {
    // Crear elemento video dinámicamente solo si no existe
    let video = document.getElementById(videoId);
    if (!video) {
      video = document.createElement('video');
      video.id = videoId;
      video.src = videoSrc;
      video.crossOrigin = 'anonymous';
      video.loop = loop;
      video.muted = muted;
      
      // Atributos específicos para móviles/iOS
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('x-webkit-airplay', 'allow');
      video.setAttribute('x5-video-player-type', 'h5');
      video.setAttribute('x5-video-player-fullscreen', 'false');
      video.setAttribute('x5-video-orientation', 'portraint');
      
      // Configuración específica para iOS
      if (isMobile) {
        video.setAttribute('preload', 'auto');
        video.setAttribute('autobuffer', '');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('playsinline', 'true');
        // Para iOS, es crucial que el video esté visible inicialmente
        video.style.position = 'absolute';
        video.style.top = '-9999px';
        video.style.left = '-9999px';
        video.style.width = '1px';
        video.style.height = '1px';
        video.style.opacity = '0.01';
      } else {
        video.preload = 'metadata';
        video.style.display = 'none';
      }

      video.addEventListener('loadedmetadata', () => {
        console.log('A-Frame Video metadata loaded:', {
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          isMobile: isMobile,
          isIOS: isIOS,
          readyState: video.readyState
        });
        setVideoLoaded(true);
      });
      video.addEventListener('canplay', () => {
        console.log('A-Frame Video can play - readyState:', video.readyState);
        if (autoPlay && !isMobile) {
          video.play().then(() => {
            console.log('A-Frame Video started playing');
            setIsPlaying(true);
          }).catch(err => {
            console.error('Error playing A-Frame video:', err);
          });
        }
      });
      video.addEventListener('canplaythrough', () => {
        console.log('A-Frame Video can play through');
      });
      video.addEventListener('loadeddata', () => {
        console.log('A-Frame Video data loaded');
      });
      video.addEventListener('playing', () => {
        console.log('A-Frame Video is playing');
        setIsPlaying(true);
      });
      video.addEventListener('pause', () => {
        console.log('A-Frame Video paused');
        setIsPlaying(false);
      });
      video.addEventListener('error', (e) => {
        console.error('A-Frame Video error:', e);
        console.error('Video error details:', {
          error: video.error,
          networkState: video.networkState,
          readyState: video.readyState,
          src: video.src,
          currentSrc: video.currentSrc
        });
      });
      document.body.appendChild(video);
      setVideoElement(video);
    } else {
      setVideoElement(video);
    }
    // Cleanup
    return () => {
      const vid = document.getElementById(videoId);
      if (vid) {
        vid.pause();
        vid.src = '';
        vid.load();
        if (vid.parentNode) {
          vid.parentNode.removeChild(vid);
        }
      }
    };
  }, [videoSrc, autoPlay, loop, muted, videoId, isMobile, isIOS]);

  const handleClick = () => {
    console.log('Video clicked - isPlaying:', isPlaying, 'readyState:', videoElement?.readyState);
    if (videoElement) {
      if (isPlaying) {
        videoElement.pause();
        setIsPlaying(false);
      } else {
        // En móviles, asegurar que el video esté listo antes de reproducir
        if (isMobile && videoElement.readyState < 2) {
          console.log('Video not ready on mobile, waiting...');
          videoElement.addEventListener('canplay', () => {
            videoElement.play().then(() => {
              setIsPlaying(true);
            }).catch(err => {
              console.error('Error playing A-Frame video on mobile:', err);
            });
          }, { once: true });
        } else {
          videoElement.play().then(() => {
            setIsPlaying(true);
          }).catch(err => {
            console.error('Error playing A-Frame video:', err);
          });
        }
      }
    }
  };

  // Ejemplo simple de "cono de palabras": entidades <a-text> en espiral
  const coneWords = [
    'palabra', 'cabeza', 'dinero', 'amigos', 'cocina', 'noche', 'luz', 'cielo', 'malo', 'bueno', 'tipo', 'veintitrés', 'cociendo', 'cosas', 'brillo', 'hombre', 'amiguitos', 'merecer', 'mamá', 'cabeza', 'hombro'
  ];
  const coneEntities = coneWords.map((word, i) => {
    const angle = (i * 2 * Math.PI) / coneWords.length;
    const radius = 4 + i * 0.1;
    const y = 1.5 + i * 0.15;
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    return (
      <a-text
        key={word + i}
        value={word}
        color="#00ccff"
        position={`${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}`}
        rotation={`0 ${(-angle * 180 / Math.PI).toFixed(2)} 0`}
        align="center"
        width="4"
      />
    );
  });

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
        {/* Assets - CRUCIAL: El video debe estar aquí para que A-Frame lo reconozca */}
        <a-assets>
          <video 
            id={videoId}
            src={videoSrc}
            crossOrigin="anonymous"
            loop={loop}
            muted={muted}
            playsInline
            preload={isMobile ? "auto" : "metadata"}
            style={{ display: 'none' }}
          />
        </a-assets>

        {/* Video plane */}
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

        {/* Cono de palabras (simple) */}
        {coneEntities}

        {/* Debug info for iOS */}
        {isIOS && (
          <a-text
            value={`iOS Debug: ${videoLoaded ? 'Video Loaded' : 'Loading...'} | ReadyState: ${videoElement?.readyState || 'N/A'}`}
            position="0 2 0"
            color="red"
            width="4"
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

export default ARSConeAFrameVideoOverlay;
