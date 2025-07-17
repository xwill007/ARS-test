import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { VideoTexture, TextureLoader } from 'three';

/**
 * ARSVideoLocal - Componente para mostrar video local en R3F
 * Props:
 * - videoSrc: ruta del video (default: '/videos/sample.mp4')
 * - position: posición [x, y, z] (default: [0, 0, 0])
 * - scale: escala del video (default: [4, 3, 1])
 * - autoPlay: reproducir automáticamente (default: true)
 * - loop: repetir video (default: true)
 * - muted: silenciar video (default: true)
 * - showFrame: mostrar marco alrededor del video (default: false)
 */
const ARSVideoLocal = forwardRef(({ 
  videoSrc = '/videos/sample.mp4', 
  position = [0, 0, 0], 
  scale = [4, 3, 1],
  autoPlay = true,
  loop = true,
  muted = false,
  showFrame = false,
  volume = 1
}, ref) => {
  // Métodos para control externo
  useImperativeHandle(ref, () => ({
    playVideo: () => {
      if (videoRef.current) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    },
    pauseVideo: () => {
      if (videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    },
    stopVideo: () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsPlaying(false);
      }
    },
    restartVideo: () => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
        setIsPlaying(true);
      }
    },
    videoRef: videoRef
  }), []);
  const meshRef = useRef();
  const videoRef = useRef();
  const [videoTexture, setVideoTexture] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Crear elemento video solo cuando cambia la fuente
    const video = document.createElement('video');
    video.src = videoSrc;
    video.crossOrigin = 'anonymous';
    video.loop = loop;
    video.muted = muted;
    video.playsInline = true;
    video.preload = 'metadata';

    // Eventos del video
    video.addEventListener('loadedmetadata', () => {
      console.log('Video metadata loaded:', {
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      });
    });

    video.addEventListener('canplay', () => {
      console.log('Video can play');
      if (autoPlay) {
        video.play().then(() => {
          video.volume = volume; // Forzar volumen al reproducir
          console.log('Video started playing');
          setIsPlaying(true);
        }).catch(err => {
          console.error('Error playing video:', err);
        });
      }
    });

    video.addEventListener('loadeddata', () => {
      console.log('Video data loaded');
    });

    video.addEventListener('playing', () => {
      console.log('Video is playing');
      setIsPlaying(true);
    });

    video.addEventListener('pause', () => {
      console.log('Video paused');
      setIsPlaying(false);
    });

    video.addEventListener('error', (e) => {
      console.error('Video error:', e);
      console.error('Video error details:', {
        error: video.error,
        networkState: video.networkState,
        readyState: video.readyState
      });
    });

    // Crear texture de video
    const texture = new VideoTexture(video);
    texture.needsUpdate = true;
    
    videoRef.current = video;
    setVideoTexture(texture);

    // Cleanup
    return () => {
      if (video) {
        video.pause();
        video.src = '';
        video.load();
      }
      if (texture) {
        texture.dispose();
      }
    };
  }, [videoSrc, autoPlay, loop, muted]);
  // Actualizar volumen cuando cambie el prop
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      console.log('[ARSVideoLocal] volume prop:', volume, 'video.volume:', videoRef.current.volume, 'muted:', videoRef.current.muted);
      // Si el volumen es 0 y sigue sonando, forzar mute
      if (volume === 0 && !videoRef.current.muted) {
        videoRef.current.muted = true;
        console.log('[ARSVideoLocal] Forzando mute por volumen 0');
      } else if (volume > 0 && videoRef.current.muted) {
        videoRef.current.muted = false;
        console.log('[ARSVideoLocal] Desmuteando por volumen > 0');
      }
    }
  }, [volume]);

  // Actualizar texture en cada frame
  useFrame(() => {
    if (videoTexture && videoRef.current) {
      videoTexture.needsUpdate = true;
    }
  });

  const handleClick = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(err => {
          console.error('Error playing video:', err);
        });
      }
    }
  };

  if (!videoTexture) {
    return (
      <mesh ref={meshRef} position={position} scale={scale}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#333" />
      </mesh>
    );
  }

  return (
    <group>
      {/* Video plane */}
      <mesh 
        ref={meshRef} 
        position={position} 
        scale={scale}
        onClick={handleClick}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={videoTexture} side={2} />
      </mesh>
      {/* Botón para desmutear si el video está muteado y el volumen es mayor a 0 */}
      {videoRef.current && videoRef.current.muted && volume > 0 && (
        <mesh position={[position[0], position[1] + 0.5, position[2] + 0.02]} onClick={() => { videoRef.current.muted = false; }}>
          <planeGeometry args={[0.6, 0.3]} />
          <meshBasicMaterial color="#ff0088" transparent opacity={0.7} />
        </mesh>
      )}
      {/* Frame border - solo si está habilitado */}
      {showFrame && (
        <mesh position={[position[0], position[1], position[2] - 0.02]} scale={[scale[0] * 1.02, scale[1] * 1.02, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.1} />
        </mesh>
      )}
      {/* Play/Pause indicator */}
      {/* Indicador de pausa: dos rectángulos verticales */}
      {!isPlaying && (
        <group>
          {/* Rectángulo izquierdo */}
          <mesh position={[position[0] - 0.13, position[1], position[2] + 0.01]}>
            <planeGeometry args={[0.15, 0.5]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
          </mesh>
          {/* Rectángulo derecho */}
          <mesh position={[position[0] + 0.13, position[1], position[2] + 0.01]}>
            <planeGeometry args={[0.15, 0.5]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
          </mesh>
        </group>
      )}
    </group>
  );
});

export default ARSVideoLocal;
