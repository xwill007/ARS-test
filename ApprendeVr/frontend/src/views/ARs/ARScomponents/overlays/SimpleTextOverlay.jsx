import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Controlador de videos sincronizados para ARS
 */
class VideoController {
  constructor() {
    this.videos = new Map(); // Almacena referencias a los iframes
    this.mainVideo = null; // Video principal con audio
    this.mirrorIframe = null; // Iframe espejo sin audio
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 0;
    this.volume = 1;
    this.isMuted = false;
    this.voiceEnabled = false; // Estado del reconocimiento de voz
    this.recognition = null;
    this.lastCommand = ''; // Último comando detectado
    this.lastCommandTime = 0; // Tiempo del último comando
    this.syncTimeout = null; // Timeout para sincronización
    this.isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    this.isMobile = /iPhone|iPad|iPod|Android|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // No configurar reconocimiento de voz automáticamente
    // Se activará manualmente con el botón
  }

  // Registrar un video principal
  registerMainVideo(id, iframe) {
    this.mainVideo = iframe;
    this.videos.set(id, iframe);
    console.log(`✅ Video principal registrado: ${id}`);
    console.log(`📊 Total de videos registrados: ${this.videos.size}`);
    
    // Configurar event listeners para el video principal
    this.setupVideoEventListeners(id, iframe);
    
    // Crear canvas espejo para el segundo panel
    this.createMirrorCanvas();
  }

  // Crear canvas espejo para mostrar imagen del video principal
  createMirrorCanvas() {
    if (!this.mainVideo) return;
    
    // Buscar el segundo panel para colocar el espejo
    const arsContainer = document.querySelector('.ar-stereo-container');
    if (arsContainer) {
      const allDivs = arsContainer.querySelectorAll('div');
      const panelsNodeList = Array.from(allDivs);
      
      // Filtrar paneles
      const panelDivs = panelsNodeList.filter(div => {
        const style = window.getComputedStyle(div);
        const width = parseInt(style.width);
        const height = parseInt(style.height);
        return width > 200 && height > 200;
      });
      
      if (panelDivs.length >= 2) {
        const secondPanel = panelDivs[1]; // Panel derecho
        
        // Crear contenedor para el espejo
        const mirrorContainer = document.createElement('div');
        mirrorContainer.id = 'mirror-container';
        mirrorContainer.style.position = 'absolute';
        mirrorContainer.style.zIndex = '1000';
        mirrorContainer.style.border = '2px solid #ff6b6b';
        mirrorContainer.style.borderRadius = '8px';
        mirrorContainer.style.backgroundColor = '#000';
        mirrorContainer.style.left = '50%';
        mirrorContainer.style.top = '50%';
        mirrorContainer.style.transform = 'translate(-50%, -50%)';
        mirrorContainer.style.width = '200px';
        mirrorContainer.style.height = '113px';
        
        // Crear iframe duplicado del video principal
        const mirrorIframe = document.createElement('iframe');
        mirrorIframe.src = this.mainVideo.src; // Usar la misma URL
        mirrorIframe.width = '100%';
        mirrorIframe.height = '100%';
        mirrorIframe.frameBorder = '0';
        mirrorIframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        mirrorIframe.style.border = 'none';
        mirrorIframe.style.borderRadius = '6px';
        mirrorIframe.muted = true; // Silenciar el espejo para evitar eco
        
        // Agregar indicador visual
        const debugIndicator = document.createElement('div');
        debugIndicator.style.position = 'absolute';
        debugIndicator.style.top = '-20px';
        debugIndicator.style.left = '0';
        debugIndicator.style.backgroundColor = '#ff6b6b';
        debugIndicator.style.color = 'white';
        debugIndicator.style.padding = '2px 6px';
        debugIndicator.style.borderRadius = '4px';
        debugIndicator.style.fontSize = '10px';
        debugIndicator.style.fontWeight = 'bold';
        debugIndicator.textContent = '🪞 Espejo';
        
        mirrorContainer.appendChild(mirrorIframe);
        mirrorContainer.appendChild(debugIndicator);
        secondPanel.appendChild(mirrorContainer);
        
        console.log('🪞 Iframe espejo creado en panel derecho');
        
        // Registrar el iframe espejo en el controlador
        this.mirrorIframe = mirrorIframe;
        this.videos.set('mirror-video', mirrorIframe);
        
        // Configurar sincronización entre el video principal y el espejo
        this.setupMirrorSync();
        
      } else {
        console.log('⚠️ No se encontró segundo panel para crear espejo');
      }
    }
  }

  // Iniciar actualización del canvas espejo
  startMirrorUpdate() {
    if (this.mirrorInterval) {
      clearInterval(this.mirrorInterval);
    }
    
    this.mirrorInterval = setInterval(() => {
      this.updateMirrorCanvas();
    }, 1000 / 30); // 30 FPS
  }

  // Actualizar canvas espejo con frame del video principal
  updateMirrorCanvas() {
    if (!this.mirrorCanvas || !this.mainVideo) return;
    
    try {
      const ctx = this.mirrorCanvas.getContext('2d');
      
      // Limpiar canvas
      ctx.clearRect(0, 0, this.mirrorCanvas.width, this.mirrorCanvas.height);
      
      // Intentar múltiples métodos para capturar el frame
      
      // Método 1: Intentar capturar directamente del iframe
      try {
        if (this.mainVideo.contentDocument) {
          const videoElement = this.mainVideo.contentDocument.querySelector('video');
          if (videoElement && videoElement.readyState >= 2) {
            ctx.drawImage(videoElement, 0, 0, this.mirrorCanvas.width, this.mirrorCanvas.height);
            return; // Éxito, salir
          }
        }
      } catch (e) {
        console.log('⚠️ Error capturando video directo:', e);
      }
      
      // Método 2: Intentar capturar el iframe completo
      try {
        ctx.drawImage(this.mainVideo, 0, 0, this.mirrorCanvas.width, this.mirrorCanvas.height);
        return; // Éxito, salir
      } catch (e) {
        console.log('⚠️ Error capturando iframe completo:', e);
      }
      
      // Método 3: Crear una imagen de placeholder con información del video
      this.drawVideoPlaceholder(ctx);
      
    } catch (e) {
      console.log('❌ Error general en updateMirrorCanvas:', e);
      // Fallback: mostrar placeholder
      this.drawVideoPlaceholder(ctx);
    }
  }

  // Dibujar placeholder cuando no se puede capturar el video
  drawVideoPlaceholder(ctx) {
    // Fondo oscuro
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, this.mirrorCanvas.width, this.mirrorCanvas.height);
    
    // Borde
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, this.mirrorCanvas.width - 4, this.mirrorCanvas.height - 4);
    
    // Icono de video
    ctx.fillStyle = '#ff6b6b';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎥', this.mirrorCanvas.width / 2, this.mirrorCanvas.height / 2 - 10);
    
    // Texto informativo
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.fillText('Video Principal', this.mirrorCanvas.width / 2, this.mirrorCanvas.height / 2 + 10);
    
    // Indicador de estado
    if (this.isPlaying) {
      ctx.fillStyle = '#4ecdc4';
      ctx.fillText('▶ Reproduciendo', this.mirrorCanvas.width / 2, this.mirrorCanvas.height / 2 + 25);
    } else {
      ctx.fillStyle = '#ff6b6b';
      ctx.fillText('⏸ Pausado', this.mirrorCanvas.width / 2, this.mirrorCanvas.height / 2 + 25);
    }
  }

  // Registrar un video (mantenido para compatibilidad)
  registerVideo(id, iframe) {
    // Si es el primer video, registrarlo como principal
    if (this.videos.size === 0) {
      this.registerMainVideo(id, iframe);
    } else {
      // Para videos adicionales, solo registrar sin crear canvas
      this.videos.set(id, iframe);
      console.log(`✅ Video adicional registrado: ${id}`);
    }
  }

  // Remover un video
  unregisterVideo(id) {
    this.videos.delete(id);
    if (this.mainVideo && this.mainVideo === this.videos.get(id)) {
      this.mainVideo = null;
    }
    console.log(`🗑️ Video removido: ${id}`);
    console.log(`📊 Total de videos registrados: ${this.videos.size}`);
  }

  // Verificar estado de videos registrados
  checkVideoStatus() {
    console.log(`🔍 Verificando estado de videos:`);
    console.log(`📊 Total de videos registrados: ${this.videos.size}`);
    console.log(`📱 Dispositivo móvil: ${this.isMobile}`);
    console.log(`🍎 iOS: ${this.isIOS}`);
    console.log(`🎥 Video principal: ${this.mainVideo ? 'Sí' : 'No'}`);
    console.log(`🪞 Iframe espejo: ${this.mirrorIframe ? 'Sí' : 'No'}`);
    
    this.videos.forEach((iframe, id) => {
      console.log(`📺 Video ${id}:`);
      console.log(`   - Iframe existe: ${!!iframe}`);
      console.log(`   - ContentWindow existe: ${!!iframe.contentWindow}`);
      console.log(`   - Src: ${iframe.src}`);
      console.log(`   - Es principal: ${iframe === this.mainVideo}`);
      console.log(`   - Es espejo: ${iframe === this.mirrorIframe}`);
    });
  }

  // Forzar interacción del usuario en móviles
  forceMobileInteraction() {
    if (this.isMobile) {
      console.log(`📱 Detectado dispositivo móvil, forzando interacción...`);
      
      // Simular un toque en la pantalla para activar la reproducción
      const touchEvent = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      
      document.dispatchEvent(touchEvent);
      console.log(`✅ Evento de toque simulado para móvil`);
    }
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
    console.log(`🎤 Comando de voz recibido: "${command}"`);
    
    // Almacenar el último comando y tiempo
    this.lastCommand = command;
    this.lastCommandTime = Date.now();
    
    // Verificar estado de videos antes de ejecutar comando
    this.checkVideoStatus();
    
    if (command.includes('play') || command.includes('reproducir') || command.includes('iniciar')) {
      console.log(`▶️ Ejecutando comando PLAY`);
      
      // Usar método sincronizado para todos los dispositivos
      this.playSynchronized();
    } else if (command.includes('pause') || command.includes('pausar') || command.includes('parar')) {
      console.log(`⏸️ Ejecutando comando PAUSE`);
      this.pause();
    } else if (command.includes('stop') || command.includes('detener')) {
      console.log(`⏹️ Ejecutando comando STOP`);
      this.stop();
    } else if (command.includes('adelante') || command.includes('siguiente') || command.includes('avanzar')) {
      console.log(`⏭️ Ejecutando comando ADELANTE`);
      this.seekForward();
    } else if (command.includes('atrás') || command.includes('anterior') || command.includes('retroceder')) {
      console.log(`⏮️ Ejecutando comando ATRÁS`);
      this.seekBackward();
    } else if (command.includes('mute') || command.includes('silenciar')) {
      console.log(`🔇 Ejecutando comando MUTE`);
      this.toggleMute();
    } else if (command.includes('volumen')) {
      if (command.includes('subir') || command.includes('aumentar')) {
        console.log(`🔊 Ejecutando comando VOLUMEN SUBIR`);
        this.setVolume(this.volume + 0.1);
      } else if (command.includes('bajar') || command.includes('disminuir')) {
        console.log(`🔉 Ejecutando comando VOLUMEN BAJAR`);
        this.setVolume(this.volume - 0.1);
      }
    } else {
      console.log(`❓ Comando no reconocido: "${command}"`);
    }
  }

  // NUEVO: Método sincronizado para reproducir solo el video principal
  playSynchronized() {
    console.log(`🎯 Iniciando reproducción del video principal y espejo`);
    
    // Verificar que hay video principal
    if (!this.mainVideo) {
      console.log('❌ No hay video principal registrado');
      return;
    }
    
    // Limpiar timeout anterior si existe
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    
    // Forzar interacción en móviles primero
    this.forceMobileInteraction();
    
    // Función para reproducir un video específico
    const playVideo = (iframe, name) => {
      try {
        if (iframe.contentWindow) {
          console.log(`🎬 Reproduciendo ${name}`);
          
          // En iOS, usar un enfoque más agresivo
          if (this.isIOS) {
            console.log(`🍎 Aplicando método iOS para ${name}`);
            
            // Método 1: PostMessage inmediato
            iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
            
            // Método 2: Simular toques después de 100ms
            setTimeout(() => {
              try {
                iframe.click();
                console.log(`👆 Toque simulado en iOS para ${name}`);
              } catch (e) {
                console.log(`⚠️ Error en toque iOS para ${name}:`, e);
              }
            }, 100);
            
            // Método 3: Buscar botones de play específicos después de 200ms
            setTimeout(() => {
              try {
                const playButtons = iframe.contentDocument?.querySelectorAll('[aria-label*="Play"], [title*="Play"], .ytp-play-button');
                playButtons?.forEach(button => {
                  button.click();
                  console.log(`✅ Clic en botón iOS para ${name}`);
                });
              } catch (e) {
                console.log(`⚠️ Error buscando botones iOS para ${name}:`, e);
              }
            }, 200);
            
            // Método 4: Reintento final después de 500ms
            setTimeout(() => {
              iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
              console.log(`🔄 Reintento final iOS para ${name}`);
            }, 500);
          } else {
            // Para otros dispositivos, método más simple
            iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          }
        } else {
          console.log(`❌ Error: iframe ${name} no está listo`);
        }
      } catch (e) {
        console.log(`❌ Error reproduciendo ${name}:`, e);
      }
    };
    
    // Reproducir video principal
    playVideo(this.mainVideo, 'video principal');
    
    // Reproducir iframe espejo si existe
    if (this.mirrorIframe) {
      console.log(`🪞 Reproduciendo iframe espejo`);
      playVideo(this.mirrorIframe, 'iframe espejo');
    } else {
      console.log(`⚠️ No hay iframe espejo para reproducir`);
    }
    
    this.isPlaying = true;
    console.log(`✅ Reproducción iniciada para ambos videos`);
    
    // Verificación final del estado
    setTimeout(() => {
      console.log(`📊 Estado final: Video principal=${!!this.mainVideo}, Iframe espejo=${!!this.mirrorIframe}`);
      this.checkVideoStatus();
    }, 2000);
  }

  // Reproducir video principal (método original para compatibilidad)
  play() {
    console.log(`Intentando reproducir video principal`);
    this.playSynchronized();
  }

  // Pausar video principal
  pause() {
    console.log(`Intentando pausar video principal y espejo`);
    
    // Función para pausar un video específico
    const pauseVideo = (iframe, name) => {
      if (iframe && iframe.contentWindow) {
        try {
          // Enviar mensaje al iframe para pausar
          iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
          console.log(`✅ Comando pause enviado al ${name}`);
          
          // En móviles, también intentar hacer clic en el botón de pause
          if (this.isMobile) {
            setTimeout(() => {
              try {
                const pauseButton = iframe.contentDocument?.querySelector('.ytp-play-button');
                if (pauseButton) {
                  pauseButton.click();
                  console.log(`✅ Clic en botón pause para móvil en ${name}`);
                }
              } catch (e) {
                console.log(`⚠️ No se pudo hacer clic en botón pause para ${name}:`, e);
              }
            }, 500);
          }
        } catch (e) {
          console.log(`❌ Error pausando ${name}:`, e);
        }
      } else {
        console.log(`❌ Error: iframe ${name} no está listo`);
      }
    };
    
    // Pausar video principal
    pauseVideo(this.mainVideo, 'video principal');
    
    // Pausar iframe espejo si existe
    if (this.mirrorIframe) {
      pauseVideo(this.mirrorIframe, 'iframe espejo');
    }
    
    this.isPlaying = false;
  }

  // Detener video principal
  stop() {
    console.log(`Intentando detener video principal y espejo`);
    
    // Función para detener un video específico
    const stopVideo = (iframe, name) => {
      if (iframe && iframe.contentWindow) {
        try {
          // Enviar mensaje al iframe para detener
          iframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
          console.log(`✅ Comando stop enviado al ${name}`);
        } catch (e) {
          console.log(`❌ Error deteniendo ${name}:`, e);
        }
      } else {
        console.log(`❌ Error: iframe ${name} no está listo`);
      }
    };
    
    // Detener video principal
    stopVideo(this.mainVideo, 'video principal');
    
    // Detener iframe espejo si existe
    if (this.mirrorIframe) {
      stopVideo(this.mirrorIframe, 'iframe espejo');
    }
    
    this.isPlaying = false;
  }

  // Avanzar en video principal
  seekForward() {
    console.log(`Intentando avanzar en video principal`);
    
    if (this.mainVideo && this.mainVideo.contentWindow) {
      try {
        // Avanzar 10 segundos
        this.mainVideo.contentWindow.postMessage('{"event":"command","func":"seekTo","args":[this.currentTime + 10, true]}', '*');
        console.log(`✅ Comando seek forward enviado al video principal`);
      } catch (e) {
        console.log(`❌ Error avanzando video principal:`, e);
      }
    } else {
      console.log(`❌ Error: iframe principal no está listo`);
    }
  }

  // Retroceder en video principal
  seekBackward() {
    console.log(`Intentando retroceder en video principal`);
    
    if (this.mainVideo && this.mainVideo.contentWindow) {
      try {
        // Retroceder 10 segundos
        this.mainVideo.contentWindow.postMessage('{"event":"command","func":"seekTo","args":[this.currentTime - 10, true]}', '*');
        console.log(`✅ Comando seek backward enviado al video principal`);
      } catch (e) {
        console.log(`❌ Error retrocediendo video principal:`, e);
      }
    } else {
      console.log(`❌ Error: iframe principal no está listo`);
    }
  }

  // Silenciar/Desilenciar video principal
  toggleMute() {
    this.isMuted = !this.isMuted;
    console.log(`Intentando ${this.isMuted ? 'silenciar' : 'desilenciar'} video principal`);
    
    if (this.mainVideo && this.mainVideo.contentWindow) {
      try {
        if (this.isMuted) {
          this.mainVideo.contentWindow.postMessage('{"event":"command","func":"mute","args":""}', '*');
        } else {
          this.mainVideo.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
        }
        console.log(`✅ Comando ${this.isMuted ? 'mute' : 'unmute'} enviado al video principal`);
      } catch (e) {
        console.log(`❌ Error ${this.isMuted ? 'silenciando' : 'desilenciando'} video principal:`, e);
      }
    } else {
      console.log(`❌ Error: iframe principal no está listo`);
    }
  }

  // Establecer volumen del video principal
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    console.log(`Intentando establecer volumen ${this.volume * 100}% en video principal`);
    
    if (this.mainVideo && this.mainVideo.contentWindow) {
      try {
        this.mainVideo.contentWindow.postMessage(`{"event":"command","func":"setVolume","args":[${this.volume * 100}]}`, '*');
        console.log(`✅ Volumen ${this.volume * 100}% establecido en video principal`);
      } catch (e) {
        console.log(`❌ Error estableciendo volumen para video principal:`, e);
      }
    } else {
      console.log(`❌ Error: iframe principal no está listo`);
    }
  }

  // Sincronizar estado de videos (mantenido para compatibilidad)
  syncVideoState(state, sourceId) {
    console.log(`Sincronizando estado ${state} desde ${sourceId}`);
    // No necesitamos sincronizar ya que solo hay un video principal
  }

  // Detectar estado actual y sincronizar (mantenido para compatibilidad)
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

  // Obtener estado actual y sincronizar (mantenido para compatibilidad)
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
    
    // Limpiar timeout de sincronización
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    
    // Limpiar observers
    if (this.observers) {
      this.observers.forEach((observer, id) => {
        observer.disconnect();
        console.log(`Observer desconectado para: ${id}`);
      });
      this.observers.clear();
    }
    
    // Remover contenedor espejo
    const mirrorContainer = document.getElementById('mirror-container');
    if (mirrorContainer && mirrorContainer.parentNode) {
      mirrorContainer.parentNode.removeChild(mirrorContainer);
    }
    
    this.videos.clear();
    this.mainVideo = null;
    this.mirrorIframe = null;
    console.log('Controlador de videos destruido');
  }

  // Obtener texto para el botón
  getButtonText() {
    if (!this.voiceEnabled) {
      return '🎤 Activar Voz';
    }
    
    // Si hay un comando reciente (últimos 5 segundos), mostrarlo
    const timeSinceLastCommand = Date.now() - this.lastCommandTime;
    if (this.lastCommand && timeSinceLastCommand < 5000) {
      return `🎤 "${this.lastCommand}"`;
    }
    
    return '🎤 Desactivar Voz';
  }

  // Método específico para iOS (mantenido para compatibilidad)
  playIOS() {
    console.log(`🍎 Usando método específico para iOS`);
    this.playSynchronized();
  }

  // Método alternativo para reproducir en móviles (mantenido para compatibilidad)
  playMobile() {
    console.log(`📱 Usando método alternativo para móviles`);
    this.playSynchronized();
  }

  // Método de emergencia para forzar reproducción
  forcePlay() {
    console.log(`🚨 Usando método de emergencia para forzar reproducción`);
    
    if (!this.mainVideo) {
      console.log('❌ No hay video principal para reproducir');
      return;
    }
    
    // Función para forzar reproducción de un video específico
    const forcePlayVideo = (iframe, name) => {
      try {
        // Método más agresivo: simular interacción directa
        const videoContainer = iframe.parentElement;
        
        // Simular toque directo en el contenedor
        const touchEvent = new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          view: window,
          touches: [new Touch({
            identifier: Date.now(),
            target: videoContainer,
            clientX: 100,
            clientY: 100,
            pageX: 100,
            pageY: 100,
            radiusX: 2.5,
            radiusY: 2.5,
            rotationAngle: 10,
            force: 0.5
          })]
        });
        
        videoContainer.dispatchEvent(touchEvent);
        console.log(`👆 Toque de emergencia en contenedor ${name}`);
        
        // También intentar hacer clic directo
        setTimeout(() => {
          try {
            videoContainer.click();
            iframe.click();
            console.log(`🖱️ Clic de emergencia en ${name}`);
          } catch (e) {
            console.log(`⚠️ Error en clic de emergencia para ${name}:`, e);
          }
        }, 100);
        
        // PostMessage de emergencia
        setTimeout(() => {
          try {
            if (iframe.contentWindow) {
              iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
              iframe.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
              console.log(`📡 PostMessage de emergencia para ${name}`);
            }
          } catch (e) {
            console.log(`⚠️ Error en PostMessage de emergencia para ${name}:`, e);
          }
        }, 200);
        
      } catch (e) {
        console.log(`❌ Error en método de emergencia para ${name}:`, e);
      }
    };
    
    // Forzar reproducción del video principal
    forcePlayVideo(this.mainVideo, 'video principal');
    
    // Forzar reproducción del iframe espejo si existe
    if (this.mirrorIframe) {
      console.log(`🪞 Forzando reproducción del iframe espejo`);
      forcePlayVideo(this.mirrorIframe, 'iframe espejo');
    } else {
      console.log(`⚠️ No hay iframe espejo para forzar reproducción`);
    }
  }

  // Configurar sincronización entre video principal y espejo
  setupMirrorSync() {
    if (!this.mainVideo || !this.mirrorIframe) return;
    
    // Escuchar mensajes del video principal y replicarlos en el espejo
    window.addEventListener('message', (event) => {
      if (event.origin !== 'https://www.youtube-nocookie.com') return;
      
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'onStateChange') {
          // Replicar el estado en el iframe espejo
          if (this.mirrorIframe.contentWindow) {
            switch (data.info) {
              case 1: // Reproduciendo
                this.mirrorIframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                break;
              case 2: // Pausado
                this.mirrorIframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                break;
              case 0: // Detenido
                this.mirrorIframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
                break;
            }
          }
        }
      } catch (e) {
        // Ignorar errores de parsing
      }
    });
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

    // En modo estéreo, crear video solo en el primer panel
    if (isStereoMode) {
      // Buscar los paneles ARS específicos
      const arsContainer = document.querySelector('.ar-stereo-container');
      if (arsContainer) {
        console.log('🎯 Contenedor ARS estéreo encontrado:', arsContainer);
        
        // Buscar TODOS los divs dentro del contenedor (menos restrictivo)
        const allDivs = arsContainer.querySelectorAll('div');
        const panelsNodeList = Array.from(allDivs);
        console.log('📋 Todos los divs encontrados:', panelsNodeList.length);
        
        // Filtrar solo los divs que parecen ser paneles (tienen dimensiones específicas)
        const panelDivs = panelsNodeList.filter(div => {
          const style = window.getComputedStyle(div);
          const width = parseInt(style.width);
          const height = parseInt(style.height);
          // Buscar divs que tengan dimensiones típicas de paneles ARS
          return width > 200 && height > 200 && 
                 (div.style.position === 'relative' || div.style.position === 'absolute' || div.className.includes('panel'));
        });
        
        console.log('🎬 Paneles filtrados encontrados:', panelDivs.length);
        
        if (panelDivs.length >= 2) {
          // Crear video solo en el primer panel (izquierdo)
          const firstPanel = panelDivs[0];
          console.log(`🎬 Creando video principal en panel izquierdo:`, {
            className: firstPanel.className,
            id: firstPanel.id,
            style: firstPanel.style.cssText
          });
          createVideoInContainer(firstPanel, videoId, 'panel-left', 0);
          
          // El canvas espejo se creará automáticamente cuando se registre el video principal
          console.log('🪞 Canvas espejo se creará automáticamente en el panel derecho');
        } else {
          // Fallback: usar los primeros 2 divs si no se encontraron paneles específicos
          console.log('⚠️ No se encontraron paneles específicos, usando fallback');
          const firstDiv = panelsNodeList[0];
          if (firstDiv) {
            console.log(`🎬 Creando video principal en div fallback:`, {
              className: firstDiv.className,
              id: firstDiv.id
            });
            createVideoInContainer(firstDiv, videoId, 'fallback-left', 0);
          }
        }
      } else {
        console.log('❌ No se encontró contenedor ARS estéreo');
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
    createEmergencyButton(); // Crear botón de emergencia

    // Verificación adicional para iOS - asegurar que ambos videos estén registrados
    if (isIOS && isStereoMode) {
      setTimeout(() => {
        console.log('🔍 Verificación de videos en iOS...');
        videoController.checkVideoStatus();
        
        // Si no hay suficientes videos registrados, intentar recrear
        if (videoController.videos.size < 2) {
          console.log('⚠️ No se registraron suficientes videos, intentando recrear...');
          
          // Remover videos existentes
          const existingVideos = document.querySelectorAll(`[id^="video-overlay-${videoId}"]`);
          existingVideos.forEach(video => {
            try {
              video.remove();
            } catch (e) {
              console.log('Error removing existing video container:', e);
            }
          });
          
          // Recrear videos después de un breve retraso
          setTimeout(() => {
            console.log('🔄 Recreando videos en iOS...');
            const arsContainer = document.querySelector('.ar-stereo-container');
            if (arsContainer) {
              const allDivs = arsContainer.querySelectorAll('div');
              const panelsNodeList = Array.from(allDivs);
              
              // Usar los primeros 2 divs disponibles
              panelsNodeList.slice(0, 2).forEach((panel, index) => {
                console.log(`🔄 Recreando video en panel ${index}`);
                createVideoInContainer(panel, videoId, `retry-${index}`, index);
              });
            }
          }, 1000);
        }
      }, 5000); // Verificar después de 5 segundos
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
      
      // Remover botón de control de voz
      const voiceButton = document.getElementById('voice-control-button');
      if (voiceButton) {
        voiceButton.remove();
      }

      // Remover botón de emergencia
      const emergencyButton = document.getElementById('emergency-play-button');
      if (emergencyButton) {
        emergencyButton.remove();
      }
    };
  }, [showVideo, videoId, isARSMode, isStereoMode]);

  // Función para crear video en un contenedor específico
  const createVideoInContainer = (container, videoId, position, index) => {
    // Solo crear video en el primer panel (izquierdo)
    if (index !== 0) {
      console.log(`🪞 Saltando creación de video para panel ${index} (solo se crea en panel izquierdo)`);
      return;
    }

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
      videoContainer.style.border = '3px solid #4ecdc4'; // Verde para video principal
      videoContainer.style.boxShadow = '0 0 20px rgba(78, 205, 196, 0.5)';
    } else {
      videoContainer.style.width = '400px';
      videoContainer.style.height = '225px';
    }

    // Crear iframe con API de YouTube habilitada
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?controls=1&playsinline=1&origin=${window.location.origin}&enablejsapi=1`;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.frameBorder = '0';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '6px';

    // Registrar el video en el controlador cuando esté listo
    iframe.onload = () => {
      const videoId = `video-${position}-${index}`;
      
      // En iOS, agregar un retraso adicional para asegurar que el iframe esté completamente cargado
      const registerVideo = () => {
        videoController.registerVideo(videoId, iframe);
        console.log(`✅ Video principal registrado en controlador: ${videoId} (Panel: ${index === 0 ? 'Izquierdo' : 'Derecho'})`);
        
        // Verificar que el video se registró correctamente
        setTimeout(() => {
          videoController.checkVideoStatus();
        }, 1000);
      };
      
      if (isIOS) {
        // En iOS, esperar un poco más para asegurar que el iframe esté completamente listo
        setTimeout(registerVideo, 2000);
      } else {
        registerVideo();
      }
    };

    // Agregar indicador visual para debug en iOS
    if (isIOS) {
      const debugIndicator = document.createElement('div');
      debugIndicator.style.position = 'absolute';
      debugIndicator.style.top = '-20px';
      debugIndicator.style.left = '0';
      debugIndicator.style.backgroundColor = '#4ecdc4'; // Verde para video principal
      debugIndicator.style.color = 'white';
      debugIndicator.style.padding = '2px 6px';
      debugIndicator.style.borderRadius = '4px';
      debugIndicator.style.fontSize = '10px';
      debugIndicator.style.fontWeight = 'bold';
      debugIndicator.textContent = `🎥 Principal`;
      videoContainer.appendChild(debugIndicator);
    }

    videoContainer.appendChild(iframe);
    container.appendChild(videoContainer);

    console.log(`🎬 Video principal creado en ${position}:`, {
      container: container.className || container.tagName,
      index: index,
      isIOS: isIOS,
      isStereoMode: isStereoMode,
      videoId: videoId
    });
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
    button.innerHTML = videoController.getButtonText();
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
    button.style.minWidth = '150px'; // Ancho mínimo para acomodar comandos
    button.style.textAlign = 'center';

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
      button.innerHTML = videoController.getButtonText();
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

    // Función para actualizar el botón periódicamente
    const updateButtonText = () => {
      if (button && button.parentNode) {
        const newText = videoController.getButtonText();
        if (button.innerHTML !== newText) {
          button.innerHTML = newText;
          // Cambiar color si hay comando reciente
          if (videoController.lastCommand && (Date.now() - videoController.lastCommandTime) < 5000) {
            button.style.backgroundColor = '#4ecdc4'; // Verde para comando detectado
            button.style.animation = 'pulse 0.5s ease-in-out';
          } else {
            button.style.backgroundColor = videoController.isVoiceEnabled() ? '#ff6b6b' : '#4ecdc4';
            button.style.animation = 'none';
          }
        }
      }
    };

    // Actualizar el botón cada 500ms para mostrar comandos en tiempo real
    const updateInterval = setInterval(updateButtonText, 500);

    // Limpiar intervalo cuando se remueva el botón
    button.addEventListener('remove', () => {
      clearInterval(updateInterval);
    });
  };

  // Función para crear botón de emergencia
  const createEmergencyButton = () => {
    // Remover botón de emergencia existente si existe
    const existingEmergencyButton = document.getElementById('emergency-play-button');
    if (existingEmergencyButton) {
      existingEmergencyButton.remove();
    }

    const emergencyButton = document.createElement('button');
    emergencyButton.id = 'emergency-play-button';
    emergencyButton.innerHTML = '🚨 Forzar Play';
    emergencyButton.style.position = 'fixed';
    emergencyButton.style.top = '70px';
    emergencyButton.style.right = '20px';
    emergencyButton.style.zIndex = '10000';
    emergencyButton.style.padding = '8px 12px';
    emergencyButton.style.backgroundColor = '#ff4757';
    emergencyButton.style.color = 'white';
    emergencyButton.style.border = 'none';
    emergencyButton.style.borderRadius = '6px';
    emergencyButton.style.fontSize = '12px';
    emergencyButton.style.fontWeight = 'bold';
    emergencyButton.style.cursor = 'pointer';
    emergencyButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
    emergencyButton.style.transition = 'all 0.3s ease';

    // Efectos hover
    emergencyButton.onmouseenter = () => {
      emergencyButton.style.transform = 'scale(1.05)';
      emergencyButton.style.backgroundColor = '#ff3742';
    };
    emergencyButton.onmouseleave = () => {
      emergencyButton.style.transform = 'scale(1)';
      emergencyButton.style.backgroundColor = '#ff4757';
    };

    // Evento de clic
    emergencyButton.onclick = () => {
      console.log(`🚨 Botón de emergencia presionado`);
      videoController.forcePlay();
      
      // Mostrar notificación
      const notification = document.createElement('div');
      notification.style.position = 'fixed';
      notification.style.top = '130px';
      notification.style.right = '20px';
      notification.style.padding = '8px 12px';
      notification.style.backgroundColor = '#ff4757';
      notification.style.color = 'white';
      notification.style.borderRadius = '6px';
      notification.style.zIndex = '10001';
      notification.style.fontSize = '11px';
      notification.style.fontWeight = 'bold';
      notification.textContent = '🚨 Forzando reproducción...';
      
      document.body.appendChild(notification);
      
      // Remover notificación después de 2 segundos
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 2000);
    };

    document.body.appendChild(emergencyButton);
    console.log('Botón de emergencia creado');
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
