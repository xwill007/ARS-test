import React from 'react';
import ARSVideoLocal from './ARSVideoLocal';
import ARSVideoYoutube from './ARSVideoYoutube';

/**
 * ARSVideoUniversal - Componente universal para videos locales y de YouTube
 * Detecta automáticamente el tipo de video basado en la URL y usa el componente apropiado
 * 
 * Props:
 * - videoSrc: URL del video (local o YouTube)
 * - position: posición [x, y, z] (default: [0, 0, 0])
 * - scale: escala del video (default: [4, 3, 1])
 * - autoPlay: reproducir automáticamente (default: true)
 * - loop: repetir video (default: true)
 * - muted: silenciar video (default: true)
 * - showFrame: mostrar marco alrededor del video (default: false)
 * - quality: calidad del video YouTube ('480', '720', '1080', 'default') (default: '720')
 */
const ARSVideoUniversal = React.forwardRef(({ 
  videoSrc = '', 
  position = [0, 0, 0], 
  scale = [4, 3, 1],
  autoPlay = true,
  loop = true,
  muted = true,
  showFrame = false,
  quality = '720',
  volume = 1
}, ref) => {
  
  // Función para detectar si es un URL de YouTube
  const isYouTubeUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    
    const youtubePatterns = [
      /(?:youtube\.com\/watch\?v=)/,
      /(?:youtu\.be\/)/,
      /(?:youtube\.com\/embed\/)/,
      /(?:youtube\.com\/v\/)/,
      /(?:m\.youtube\.com\/watch\?v=)/,
      /(?:youtube-nocookie\.com\/embed\/)/
    ];
    
    return youtubePatterns.some(pattern => pattern.test(url));
  };

  // Determinar qué componente usar
  const isYoutube = isYouTubeUrl(videoSrc);
  
  console.log('ARSVideoUniversal:', {
    videoSrc,
    isYoutube,
    componentType: isYoutube ? 'YouTube' : 'Local'
  });

  // Props comunes para ambos componentes
  const commonProps = {
    position,
    scale,
    autoPlay,
    loop,
    muted,
    showFrame,
    volume // <-- Se agrega el prop volume
  };

  if (isYoutube) {
    return (
      <ARSVideoYoutube 
        ref={ref}
        {...commonProps}
        youtubeUrl={videoSrc}
        quality={quality}
      />
    );
  }

  return (
    <ARSVideoLocal 
      ref={ref}
      {...commonProps}
      videoSrc={videoSrc}
    />
  );
});

export default ARSVideoUniversal;
