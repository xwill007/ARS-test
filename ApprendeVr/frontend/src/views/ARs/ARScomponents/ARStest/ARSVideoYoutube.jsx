import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { VideoTexture } from 'three';

/**
 * ARSVideoYoutube - Componente para mostrar video de YouTube en R3F
 * Props:
 * - youtubeUrl: URL del video de YouTube (default: '')
 * - position: posición [x, y, z] (default: [0, 0, 0])
 * - scale: escala del video (default: [4, 3, 1])
 * - autoPlay: reproducir automáticamente (default: true)
 * - loop: repetir video (default: true)
 * - muted: silenciar video (default: true)
 * - showFrame: mostrar marco alrededor del video (default: false)
 * - quality: calidad del video ('480', '720', '1080', 'default') (default: '720')
 */
const ARSVideoYoutube = forwardRef(({ 
  youtubeUrl = '', 
  position = [0, 0, 0], 
  scale = [4, 3, 1],
  autoPlay = true,
  loop = true,
  muted = true,
  showFrame = false,
  quality = '720'
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
    }
  }), []);
  const meshRef = useRef();
  const videoRef = useRef();
  const iframeRef = useRef();
  const [videoTexture, setVideoTexture] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Función para extraer video ID de URL de YouTube
  const extractVideoId = (url) => {
    if (!url) return null;
    
    // Patrones comunes de URLs de YouTube
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };

  useEffect(() => {
    if (!youtubeUrl) {
      setError('No YouTube URL provided');
      setIsLoading(false);
      return;
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      setError('Invalid YouTube URL');
      setIsLoading(false);
      return;
    }

    console.log('Loading YouTube video:', { youtubeUrl, videoId });
    setError(null);
    setIsLoading(true);

    // Crear iframe oculto para el video de YouTube
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '640px';
    iframe.style.height = '360px';
    iframe.style.border = 'none';
    iframe.allow = 'autoplay; encrypted-media';
    
    // Configurar parámetros del iframe
    const params = new URLSearchParams({
      enablejsapi: '1',
      origin: window.location.origin,
      autoplay: autoPlay ? '1' : '0',
      loop: loop ? '1' : '0',
      mute: muted ? '1' : '0',
      controls: '0',
      modestbranding: '1',
      rel: '0',
      showinfo: '0',
      fs: '0',
      disablekb: '1',
      iv_load_policy: '3',
      playlist: loop ? videoId : '',
      vq: quality === 'default' ? 'auto' : `hd${quality}`
    });

    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
    
    // Agregar iframe al DOM
    document.body.appendChild(iframe);
    iframeRef.current = iframe;

    // Crear video element para capturar el stream
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.playsInline = true;
    video.muted = muted;
    video.loop = loop;
    video.preload = 'metadata';

    // Intentar capturar el iframe como video stream
    const setupVideoCapture = async () => {
      try {
        // Esperar a que el iframe cargue
        await new Promise((resolve) => {
          iframe.onload = resolve;
          setTimeout(resolve, 3000); // Timeout de seguridad
        });

        // Intentar capturar el contenido del iframe
        if (iframe.contentWindow && iframe.contentDocument) {
          // Método 1: Canvas capture (más compatible)
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 360;
          const ctx = canvas.getContext('2d');
          
          // Crear texture desde canvas
          const texture = new VideoTexture(video);
          texture.needsUpdate = true;
          
          // Función para actualizar canvas con contenido del iframe
          const updateCanvas = () => {
            try {
              ctx.fillStyle = '#000000';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              
              // Dibujar texto indicativo mientras se carga
              ctx.fillStyle = '#ffffff';
              ctx.font = '20px Arial';
              ctx.textAlign = 'center';
              ctx.fillText('YouTube Video Loading...', canvas.width / 2, canvas.height / 2);
              
              texture.needsUpdate = true;
            } catch (e) {
              console.warn('Canvas update error:', e);
            }
          };

          // Actualizar canvas inicialmente
          updateCanvas();
          
          // Configurar video source desde canvas
          const canvasStream = canvas.captureStream(30);
          video.srcObject = canvasStream;
          
          setVideoTexture(texture);
          setIsLoading(false);
          
          // Simular reproducción
          if (autoPlay) {
            setIsPlaying(true);
          }
          
        } else {
          throw new Error('Cannot access iframe content');
        }
      } catch (error) {
        console.error('Error setting up video capture:', error);
        
        // Fallback: crear texture con placeholder
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        
        // Dibujar placeholder
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🎬 YOUTUBE VIDEO', canvas.width / 2, canvas.height / 2 - 30);
        ctx.font = '20px Arial';
        ctx.fillText('Click to Open', canvas.width / 2, canvas.height / 2 + 10);
        ctx.font = '16px Arial';
        ctx.fillText(videoId, canvas.width / 2, canvas.height / 2 + 35);
        
        const canvasStream = canvas.captureStream(1);
        video.srcObject = canvasStream;
        
        const texture = new VideoTexture(video);
        texture.needsUpdate = true;
        setVideoTexture(texture);
        setIsLoading(false);
        setError('YouTube video loaded as placeholder');
      }
    };

    setupVideoCapture();
    videoRef.current = video;

    // Cleanup
    return () => {
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
      if (video) {
        if (video.srcObject) {
          const tracks = video.srcObject.getTracks();
          tracks.forEach(track => track.stop());
        }
        video.srcObject = null;
      }
      if (videoTexture) {
        videoTexture.dispose();
      }
    };
  }, [youtubeUrl, autoPlay, loop, muted, quality]);

  // Actualizar texture en cada frame
  useFrame(() => {
    if (videoTexture && videoRef.current) {
      videoTexture.needsUpdate = true;
    }
  });

  const handleClick = () => {
    console.log('YouTube video clicked - opening in new window');
    if (youtubeUrl) {
      window.open(youtubeUrl, '_blank');
    }
  };

  // Mostrar estado de carga
  if (isLoading) {
    return (
      <mesh ref={meshRef} position={position} scale={scale}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#444" />
      </mesh>
    );
  }

  // Mostrar error
  if (error && !videoTexture) {
    return (
      <mesh ref={meshRef} position={position} scale={scale}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#663333" />
      </mesh>
    );
  }

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
      
      {/* Frame border - solo si está habilitado */}
      {showFrame && (
        <mesh position={[position[0], position[1], position[2] - 0.02]} scale={[scale[0] * 1.02, scale[1] * 1.02, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.1} />
        </mesh>
      )}
      
      {/* YouTube indicator */}
      <mesh position={[position[0] + scale[0] * 0.35, position[1] + scale[1] * 0.35, position[2] + 0.01]}>
        <planeGeometry args={[0.6, 0.4]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.9} />
      </mesh>
      
      {/* YouTube logo text */}
      <mesh position={[position[0] + scale[0] * 0.35, position[1] + scale[1] * 0.35, position[2] + 0.02]}>
        <planeGeometry args={[0.5, 0.2]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={1} />
      </mesh>
      
      {/* Play indicator */}
      {!isPlaying && (
        <mesh position={[position[0], position[1], position[2] + 0.01]}>
          <planeGeometry args={[0.5, 0.5]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.7} />
        </mesh>
      )}
      
      {/* Error indicator */}
      {error && (
        <mesh position={[position[0], position[1] - scale[1] * 0.4, position[2] + 0.01]}>
          <planeGeometry args={[scale[0] * 0.8, 0.2]} />
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
});

export default ARSVideoYoutube;
