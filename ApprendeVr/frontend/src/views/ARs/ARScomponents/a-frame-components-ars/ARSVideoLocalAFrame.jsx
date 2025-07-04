import React, { useRef, useEffect, useState } from 'react';

/**
 * ARSVideoLocalAFrame - Componente para mostrar video local en A-Frame
 * Props:
 * - videoSrc: ruta del video (default: '/videos/sample.mp4')
 * - position: posición "x y z" (default: "0 0 0")
 * - scale: escala "x y z" (default: "4 3 1")
 * - autoPlay: reproducir automáticamente (default: true)
 * - loop: repetir video (default: true)
 * - muted: silenciar video (default: true)
 */
const ARSVideoLocalAFrame = ({ 
  videoSrc = '/videos/sample.mp4', 
  position = "0 0 0", 
  scale = "4 3 1",
  autoPlay = true,
  loop = true,
  muted = true
}) => {
  const sceneRef = useRef();
  const videoId = `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoElement, setVideoElement] = useState(null);

  useEffect(() => {
    // Crear elemento video dinámicamente
    const video = document.createElement('video');
    video.id = videoId;
    video.src = videoSrc;
    video.crossOrigin = 'anonymous';
    video.loop = loop;
    video.muted = muted;
    video.playsInline = true;
    video.preload = 'metadata';
    video.style.display = 'none';

    // Eventos del video
    video.addEventListener('loadedmetadata', () => {
      console.log('A-Frame Video metadata loaded:', {
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      });
    });

    video.addEventListener('canplay', () => {
      console.log('A-Frame Video can play');
      if (autoPlay) {
        video.play().then(() => {
          console.log('A-Frame Video started playing');
          setIsPlaying(true);
        }).catch(err => {
          console.error('Error playing A-Frame video:', err);
        });
      }
    });

    video.addEventListener('error', (e) => {
      console.error('A-Frame Video error:', e);
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
    if (videoElement) {
      if (isPlaying) {
        videoElement.pause();
        setIsPlaying(false);
      } else {
        videoElement.play().then(() => {
          setIsPlaying(true);
        }).catch(err => {
          console.error('Error playing A-Frame video:', err);
        });
      }
    }
  };

  return (
    <div ref={sceneRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <a-scene 
        embedded 
        style={{ width: '100%', height: '100%' }}
        vr-mode-ui="enabled: false"
        background="color: transparent"
      >
        {/* Assets */}
        <a-assets>
          {/* El video ya está en el DOM, solo referenciamos por ID */}
        </a-assets>

        {/* Video plane */}
        <a-plane
          position={position}
          scale={scale}
          material={`src: #${videoId}; transparent: true; opacity: 1`}
          onClick={handleClick}
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

        {/* Camera for embedded scene */}
        <a-camera position="0 0 5" look-controls="enabled: false" wasd-controls="enabled: false" />
      </a-scene>
    </div>
  );
};

export default ARSVideoLocalAFrame;
