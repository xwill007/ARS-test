import React, { useRef, useEffect, useState } from 'react';
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
 */
const ARSVideoLocal = ({ 
  videoSrc = '/videos/sample.mp4', 
  position = [0, 0, 0], 
  scale = [4, 3, 1],
  autoPlay = true,
  loop = true,
  muted = true
}) => {
  const meshRef = useRef();
  const videoRef = useRef();
  const [videoTexture, setVideoTexture] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Crear elemento video
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
          console.log('Video started playing');
          setIsPlaying(true);
        }).catch(err => {
          console.error('Error playing video:', err);
        });
      }
    });

    video.addEventListener('error', (e) => {
      console.error('Video error:', e);
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
        <meshBasicMaterial map={videoTexture} />
      </mesh>
      
      {/* Frame border */}
      <mesh position={position} scale={[scale[0] * 1.05, scale[1] * 1.05, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#222" transparent opacity={0.8} />
      </mesh>
      
      {/* Play/Pause indicator */}
      {!isPlaying && (
        <mesh position={[position[0], position[1], position[2] + 0.01]}>
          <planeGeometry args={[0.5, 0.5]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
};

export default ARSVideoLocal;
