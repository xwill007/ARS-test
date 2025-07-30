import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Controlador de videos sincronizados para ARS
 */
class VideoController {
  constructor() {
    this.videos = new Map(); // Almacena referencias a los iframes
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 0;
    this.volume = 1;
    this.isMuted = false;
    this.voiceEnabled = false; // Estado del reconocimiento de voz
    this.recognition = null;
    
    // No configurar reconocimiento de voz automáticamente
    // Se activará manualmente con el botón
  }

  // Registrar un video
  registerVideo(id, iframe) {
    this.videos.set(id, iframe);
    console.log(`Video registrado: ${id}`);
    
    // Agregar event listener para detectar cambios de estado
    this.setupVideoEventListeners(id, iframe);
  }

  // Remover un video
  unregisterVideo(id) {
    this.videos.delete(id);
    console.log(`Video removido: ${id}`);
  }

  // Activar/Desactivar reconocimiento de voz
  toggleVoiceRecognition() {
    if (this.voiceEnabled) {
      this.disableVoiceRecognition();
    } else {
      this.enableVoiceRecognition();
    }
  }

  // Activar reconocimiento de voz
  enableVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = 'es-ES';

      this.recognition.onresult = (event) => {
        const command = event.results[event.results.length - 1][0].transcript.toLowerCase();
        console.log('Comando de voz detectado:', command);
        this.handleVoiceCommand(command);
      };

      this.recognition.onerror = (event) => {
        console.log('Error en reconocimiento de voz:', event.error);
        // Si hay error, desactivar automáticamente
        if (event.error === 'no-speech' || event.error === 'aborted') {
          this.disableVoiceRecognition();
        }
      };

      this.recognition.onend = () => {
        // Solo reiniciar si está habilitado
        if (this.voiceEnabled && this.recognition) {
          this.recognition.start();
        }
      };

      // Iniciar reconocimiento
      this.recognition.start();
      this.voiceEnabled = true;
      console.log('Controlador de voz activado');
    } else {
      console.log('Reconocimiento de voz no disponible');
      alert('Reconocimiento de voz no disponible en este navegador');
    }
  }

  // Desactivar reconocimiento de voz
  disableVoiceRecognition() {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
    this.voiceEnabled = false;
    console.log('Controlador de voz desactivado');
  }

  // Obtener estado del reconocimiento de voz
  isVoiceEnabled() {
    return this.voiceEnabled;
  }

  // Configurar reconocimiento de voz
  setupVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = 'es-ES';

      this.recognition.onresult = (event) => {
        const command = event.results[event.results.length - 1][0].transcript.toLowerCase();
        console.log('Comando de voz detectado:', command);
        this.handleVoiceCommand(command);
      };

      this.recognition.onerror = (event) => {
        console.log('Error en reconocimiento de voz:', event.error);
      };

      this.recognition.onend = () => {
        // Reiniciar reconocimiento
        this.recognition.start();
      };

      // Iniciar reconocimiento
      this.recognition.start();
      console.log('Controlador de voz iniciado');
    } else {
      console.log('Reconocimiento de voz no disponible');
    }
  }

  // Configurar event listeners para sincronización
  setupVideoEventListeners(id, iframe) {
    // Escuchar mensajes del iframe de YouTube
    window.addEventListener('message', (event) => {
      if (event.origin !== 'https://www.youtube-nocookie.com') return;
      
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'onStateChange') {
          // Estado del video cambió, sincronizar con el otro
          this.syncVideoState(data.info, id);
        }
      } catch (e) {
        // Ignorar errores de parsing
      }
    });

    // Escuchar clics en el contenedor del video
    const videoContainer = iframe.parentElement;
    if (videoContainer) {
      videoContainer.addEventListener('click', (e) => {
        console.log(`Clic detectado en contenedor de video: ${id}`);
        // Detectar el estado actual y sincronizar
        this.detectAndSyncState(id);
      });
    }

    // Usar MutationObserver para detectar cambios en el iframe
    this.setupMutationObserver(id, iframe);
  }

  // Configurar MutationObserver para detectar cambios
  setupMutationObserver(id, iframe) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
          console.log(`Cambio de src detectado en video: ${id}`);
          // Detectar el estado basándose en el cambio de URL
          this.detectStateFromURL(id);
        }
      });
    });

    // Observar cambios en el atributo src del iframe
    observer.observe(iframe, {
      attributes: true,
      attributeFilter: ['src']
    });

    // Guardar el observer para limpiarlo después
    if (!this.observers) this.observers = new Map();
    this.observers.set(id, observer);
  }

  // Detectar estado basándose en la URL
  detectStateFromURL(id) {
    const iframe = this.videos.get(id);
    if (!iframe) return;
    
    const currentSrc = iframe.src;
    console.log(`URL actual del video ${id}:`, currentSrc);
    
    // Analizar la URL para determinar el estado
    let state = 1; // Por defecto reproduciendo
    
    if (currentSrc.includes('pause=1')) {
      state = 2; // Pausado
    } else if (currentSrc.includes('stop=1')) {
      state = 0; // Detenido
    }
    
    console.log(`Estado detectado para ${id}: ${state}`);
    this.syncVideoState(state, id);
  }

  // Manejar comandos de voz
  handleVoiceCommand(command) {
    if (command.includes('play') || command.includes('reproducir') || command.includes('iniciar')) {
      this.play();
    } else if (command.includes('pause') || command.includes('pausar') || command.includes('parar')) {
      this.pause();
    } else if (command.includes('stop') || command.includes('detener')) {
      this.stop();
    } else if (command.includes('adelante') || command.includes('siguiente') || command.includes('avanzar')) {
      this.seekForward();
    } else if (command.includes('atrás') || command.includes('anterior') || command.includes('retroceder')) {
      this.seekBackward();
    } else if (command.includes('mute') || command.includes('silenciar')) {
      this.toggleMute();
    } else if (command.includes('volumen')) {
      if (command.includes('subir') || command.includes('aumentar')) {
        this.setVolume(this.volume + 0.1);
      } else if (command.includes('bajar') || command.includes('disminuir')) {
        this.setVolume(this.volume - 0.1);
      }
    }
  }

  // Reproducir todos los videos
  play() {
    this.videos.forEach((iframe, id) => {
      try {
        // Enviar mensaje al iframe para reproducir
        iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        console.log(`Reproduciendo video: ${id}`);
      } catch (e) {
        console.log(`Error reproduciendo video ${id}:`, e);
      }
    });
    this.isPlaying = true;
  }

  // Pausar todos los videos
  pause() {
    this.videos.forEach((iframe, id) => {
      try {
        // Enviar mensaje al iframe para pausar
        iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        console.log(`Pausando video: ${id}`);
      } catch (e) {
        console.log(`Error pausando video ${id}:`, e);
      }
    });
    this.isPlaying = false;
  }

  // Detener todos los videos
  stop() {
    this.videos.forEach((iframe, id) => {
      try {
        // Enviar mensaje al iframe para detener
        iframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
        console.log(`Deteniendo video: ${id}`);
      } catch (e) {
        console.log(`Error deteniendo video ${id}:`, e);
      }
    });
    this.isPlaying = false;
  }

  // Avanzar en todos los videos
  seekForward() {
    this.videos.forEach((iframe, id) => {
      try {
        // Avanzar 10 segundos
        iframe.contentWindow.postMessage('{"event":"command","func":"seekTo","args":[this.currentTime + 10, true]}', '*');
        console.log(`Avanzando video: ${id}`);
      } catch (e) {
        console.log(`Error avanzando video ${id}:`, e);
      }
    });
  }

  // Retroceder en todos los videos
  seekBackward() {
    this.videos.forEach((iframe, id) => {
      try {
        // Retroceder 10 segundos
        iframe.contentWindow.postMessage('{"event":"command","func":"seekTo","args":[this.currentTime - 10, true]}', '*');
        console.log(`Retrocediendo video: ${id}`);
      } catch (e) {
        console.log(`Error retrocediendo video ${id}:`, e);
      }
    });
  }

  // Silenciar/Desilenciar todos los videos
  toggleMute() {
    this.isMuted = !this.isMuted;
    this.videos.forEach((iframe, id) => {
      try {
        if (this.isMuted) {
          iframe.contentWindow.postMessage('{"event":"command","func":"mute","args":""}', '*');
        } else {
          iframe.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
        }
        console.log(`${this.isMuted ? 'Silenciando' : 'Desilenciando'} video: ${id}`);
      } catch (e) {
        console.log(`Error ${this.isMuted ? 'silenciando' : 'desilenciando'} video ${id}:`, e);
      }
    });
  }

  // Establecer volumen
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.videos.forEach((iframe, id) => {
      try {
        iframe.contentWindow.postMessage(`{"event":"command","func":"setVolume","args":[${this.volume * 100}]}`, '*');
        console.log(`Volumen establecido en ${this.volume * 100}% para video: ${id}`);
      } catch (e) {
        console.log(`Error estableciendo volumen para video ${id}:`, e);
      }
    });
  }

  // Sincronizar estado de videos
  syncVideoState(state, sourceId) {
    console.log(`Sincronizando estado ${state} desde ${sourceId}`);
    
    this.videos.forEach((iframe, id) => {
      if (id === sourceId) return; // No sincronizar consigo mismo
      
      try {
        switch (state) {
          case 1: // Reproduciendo
            iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
            console.log(`Sincronizando play en: ${id}`);
            break;
          case 2: // Pausado
            iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
            console.log(`Sincronizando pause en: ${id}`);
            break;
          case 0: // Terminado
            iframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
            console.log(`Sincronizando stop en: ${id}`);
            break;
        }
      } catch (e) {
        console.log(`Error sincronizando estado en ${id}:`, e);
      }
    });
  }

  // Detectar estado actual y sincronizar
  detectAndSyncState(sourceId) {
    const sourceIframe = this.videos.get(sourceId);
    if (!sourceIframe) return;
    
    try {
      // Obtener estado actual del video fuente
      sourceIframe.contentWindow.postMessage('{"event":"command","func":"getPlayerState","args":""}', '*');
      
      // Usar un timeout para obtener el estado
      setTimeout(() => {
        // Intentar obtener el estado actual
        this.getCurrentStateAndSync(sourceId);
      }, 100);
    } catch (e) {
      console.log(`Error detectando estado de ${sourceId}:`, e);
    }
  }

  // Obtener estado actual y sincronizar
  getCurrentStateAndSync(sourceId) {
    // Como no podemos obtener el estado directamente, usamos un enfoque diferente
    // Detectamos el estado basándonos en la URL del iframe o el estado visual
    const sourceIframe = this.videos.get(sourceId);
    if (!sourceIframe) return;
    
    // Verificar si el video está reproduciéndose basándose en la URL
    const currentSrc = sourceIframe.src;
    const isPlaying = !currentSrc.includes('pause=1');
    
    // Sincronizar basándose en la detección
    this.syncVideoState(isPlaying ? 1 : 2, sourceId);
  }

  // Limpiar recursos
  destroy() {
    if (this.recognition) {
      this.recognition.stop();
    }
    
    // Limpiar observers
    if (this.observers) {
      this.observers.forEach((observer, id) => {
        observer.disconnect();
        console.log(`Observer desconectado para: ${id}`);
      });
      this.observers.clear();
    }
    
    this.videos.clear();
    console.log('Controlador de videos destruido');
  }
}

// Instancia global del controlador
const videoController = new VideoController();

/**
 * SimpleTextOverlay mejorado con video de YouTube
 * Incluye texto y video para demostrar funcionalidad completa
 * Versión optimizada para contexto ARS estéreo con controlador sincronizado
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
        
        // Crear videos solo en los primeros 2 divs (panel izquierdo y derecho)
        panelsNodeList.slice(0, 2).forEach((panel, index) => {
          createVideoInContainer(panel, videoId, `panel-${index}`, index);
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
      createVideoInContainer(targetContainer, videoId, 'center', 0);
    }

    // Crear botón de control de voz
    createVoiceControlButton();

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
      
      // Remover botón de control de voz
      const voiceButton = document.getElementById('voice-control-button');
      if (voiceButton) {
        voiceButton.remove();
      }
    };
  }, [showVideo, videoId, isARSMode, isStereoMode]);

  // Función para crear video en un contenedor específico
  const createVideoInContainer = (container, videoId, position, index) => {
    const videoContainer = document.createElement('div');
    videoContainer.id = `video-overlay-${videoId}-${position}`;
    videoContainer.style.position = 'absolute';
    videoContainer.style.zIndex = '1000';
    videoContainer.style.pointerEvents = 'auto';
    videoContainer.style.border = '2px solid #333';
    videoContainer.style.borderRadius = '8px';
    videoContainer.style.backgroundColor = '#000';

    // Ajustar posición según el índice del panel
    if (isARSMode && isStereoMode) {
      if (index === 0) {
        // Panel izquierdo - video más a la izquierda
        videoContainer.style.left = '25%';
        videoContainer.style.top = '50%';
        videoContainer.style.transform = 'translate(-50%, -50%)';
      } else if (index === 1) {
        // Panel derecho - video más a la derecha
        videoContainer.style.left = '75%';
        videoContainer.style.top = '50%';
        videoContainer.style.transform = 'translate(-50%, -50%)';
      } else {
        // Otros paneles - centro
        videoContainer.style.left = '50%';
        videoContainer.style.top = '50%';
        videoContainer.style.transform = 'translate(-50%, -50%)';
      }
    } else {
      // Modo normal - centro
      videoContainer.style.left = '50%';
      videoContainer.style.top = '50%';
      videoContainer.style.transform = 'translate(-50%, -50%)';
    }

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

    // Crear iframe con API de YouTube habilitada
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=1&playsinline=1&origin=${window.location.origin}&enablejsapi=1`;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.frameBorder = '0';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '6px';

    // Registrar el video en el controlador cuando esté listo
    iframe.onload = () => {
      const videoId = `video-${position}-${index}`;
      videoController.registerVideo(videoId, iframe);
      console.log(`Video registrado en controlador: ${videoId}`);
    };

    videoContainer.appendChild(iframe);
    container.appendChild(videoContainer);

    console.log(`Video container created in ${position}:`, container.className || container.tagName, 'Container style:', container.style.cssText);
  };

  // Función para crear botón de control de voz
  const createVoiceControlButton = () => {
    // Remover botón existente si existe
    const existingButton = document.getElementById('voice-control-button');
    if (existingButton) {
      existingButton.remove();
    }

    const button = document.createElement('button');
    button.id = 'voice-control-button';
    button.innerHTML = videoController.isVoiceEnabled() ? '🎤 Desactivar Voz' : '🎤 Activar Voz';
    button.style.position = 'fixed';
    button.style.top = '20px';
    button.style.right = '20px';
    button.style.zIndex = '10000';
    button.style.padding = '10px 15px';
    button.style.backgroundColor = videoController.isVoiceEnabled() ? '#ff6b6b' : '#4ecdc4';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '8px';
    button.style.fontSize = '14px';
    button.style.fontWeight = 'bold';
    button.style.cursor = 'pointer';
    button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
    button.style.transition = 'all 0.3s ease';

    // Efectos hover
    button.onmouseenter = () => {
      button.style.transform = 'scale(1.05)';
      button.style.boxShadow = '0 6px 12px rgba(0,0,0,0.4)';
    };
    button.onmouseleave = () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
    };

    // Evento de clic
    button.onclick = () => {
      videoController.toggleVoiceRecognition();
      // Actualizar texto del botón
      button.innerHTML = videoController.isVoiceEnabled() ? '🎤 Desactivar Voz' : '🎤 Activar Voz';
      button.style.backgroundColor = videoController.isVoiceEnabled() ? '#ff6b6b' : '#4ecdc4';
      
      // Mostrar notificación
      const notification = document.createElement('div');
      notification.style.position = 'fixed';
      notification.style.top = '80px';
      notification.style.right = '20px';
      notification.style.padding = '10px 15px';
      notification.style.backgroundColor = videoController.isVoiceEnabled() ? '#4ecdc4' : '#ff6b6b';
      notification.style.color = 'white';
      notification.style.borderRadius = '8px';
      notification.style.zIndex = '10001';
      notification.style.fontSize = '12px';
      notification.style.fontWeight = 'bold';
      notification.textContent = videoController.isVoiceEnabled() ? 
        '🎤 Voz activada - Di comandos como "reproducir", "pausar", "adelante"' : 
        '🔇 Voz desactivada';
      
      document.body.appendChild(notification);
      
      // Remover notificación después de 3 segundos
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 3000);
    };

    document.body.appendChild(button);
    console.log('Botón de control de voz creado');
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
