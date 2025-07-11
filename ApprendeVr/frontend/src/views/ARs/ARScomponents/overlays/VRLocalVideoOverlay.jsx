import React from 'react';

// Función para leer la configuración de autoinicio de voz
const getVoiceCommandsActivated = () => {
  // Intenta leer de localStorage
  try {
    const persisted = localStorage.getItem('arsconfig-persistent');
    if (persisted) {
      const parsed = JSON.parse(persisted);
      if (parsed && parsed.userConfig && typeof parsed.userConfig.voiceCommandsActivated !== 'undefined') {
        return parsed.userConfig.voiceCommandsActivated;
      }
    }
  } catch (e) {}
  // Intenta leer de config (si existe)
  if (typeof window !== 'undefined' && window.arsConfigManager && window.arsConfigManager.config && typeof window.arsConfigManager.config.userConfig !== 'undefined') {
    const val = window.arsConfigManager.config.userConfig.voiceCommandsActivated;
    if (typeof val !== 'undefined') return val;
  }
  // Si no existe, retorna false por defecto
  return false;
};

/**
 * Overlay para video local usando A-Frame HTML en iframe
 * Siguiendo el patrón del VRConeOverlay
 */
const VRLocalVideoOverlay = ({ 
  position = [0, 5, -8], 
  rotation = [0, 0, 0],
  videoSrc = '/videos/gangstas.mp4',
  width = 8,
  height = 4.5,
  autoplay = false,
  doubleSided = true,
  invertBackSide = true,
  showMarker = true,
  enableVoiceCommands = true,
  voiceCommandsActivated = false,
  showCursor = true,
  // Props para optimización estereoscópica (simplificadas)
  isMirrorPanel = false, 
  muteAudio = false, 
  disableInteractions = false,
  ...props 
}) => {

  // Si es panel espejo, renderizar solo un placeholder simple
  if (isMirrorPanel) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        background: '#333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#4CAF50',
        fontSize: '24px',
        fontFamily: 'Arial'
      }}>
        🪞 Panel Espejo
        <br />
        <small style={{ fontSize: '14px', marginTop: '10px' }}>
          El contenido se copia del panel izquierdo
        </small>
      </div>
    );
  }

  // Generar el marcador visual (opcional)
  const generateMarker = () => {
    if (!showMarker) return '';
    
    return `
      <!-- Marcador visual para referencia -->
      <a-sphere
        id="video-marker"
        position="${position[0]} ${position[1] - height/2 - 1} ${position[2]}"
        radius="0.2"
        color="#00ff00"
        opacity="0.7"
        animation="property: rotation; to: 0 360 0; loop: true; dur: 4000">
      </a-sphere>
    `;
  };

  // Generar controles de voz
  const generateVoiceControls = () => {
    if (!enableVoiceCommands) return '';
    
    return `
      <!-- Controles de voz (solo si no es panel espejo) -->
      ${!isMirrorPanel ? `
      <a-entity
        id="voice-controls"
        position="${position[0]} ${position[1] - height/2 - 2.5} ${position[2]}"
        voice-control="
          enabled: ${voiceCommandsActivated};
          videoEntity: vr-local-video-entity;
          isMirrorPanel: ${isMirrorPanel}
        ">` : ''}
        
        <!-- Icono de micrófono -->
        <a-entity
          id="mic-icon"
          position="0 0 0.01"
          class="clickable raycastable"
          mic-icon>
          
          <!-- Fondo circular del micrófono (tamaño reducido) - también clickeable -->
          <a-circle
            radius="0.6"
            material="color: #F44336; shader: flat; opacity: 0.9"
            class="clickable raycastable">
          </a-circle>
          
          <!-- Símbolo del micrófono usando geometría (tamaño reducido) -->
          <a-cylinder
            radius="0.15"
            height="0.3"
            position="0 0.1 0.02"
            material="color: white; shader: flat">
          </a-cylinder>
          
          <!-- Base del micrófono (tamaño reducido) -->
          <a-cylinder
            radius="0.25"
            height="0.05"
            position="0 -0.15 0.02"
            material="color: white; shader: flat">
          </a-cylinder>
          
          <!-- Pie del micrófono (tamaño reducido) -->
          <a-cylinder
            radius="0.025"
            height="0.2"
            position="0 -0.05 0.02"
            material="color: white; shader: flat">
          </a-cylinder>
          
          <!-- Indicador de estado (tamaño extra grande y en negrita) -->
          <a-text
            id="mic-status"
            value="OFF"
            position="0 -0.40 0.03"
            align="center"
            color="#FFB3B3"
            scale="1.0 1.0 1.0"
            font="kelsonsans"
            shader="msdf">
          </a-text>
          
        </a-entity>
        
        <!-- Texto de reconocimiento de voz (ahora oculto por defecto) -->
        <a-text
          id="voice-text"
          value="🎤 Comandos: 'play', 'pause', 'reproducir', 'pausar'"
          position="0 -2.0 0"
          align="center"
          color="#87CEEB"
          scale="1.2 1.2 1.2"
          width="8"
          visible="false">
        </a-text>
        
        <!-- Indicador de escucha con icono de ayuda -->
        <a-text
          id="listening-indicator"
          value=""
          position="0 0.8 0"
          align="center"
          color="#4CAF50"
          scale="0.8 0.8 0.8"
          width="6"
          visible="false">
        </a-text>
        
        <!-- Icono de interrogación (ayuda) -->
        <a-text
          id="help-icon"
          value="AYUDA"
          position="0 -1.2 0"
          align="center"
          color="#87CEEB"
          scale="1.0 1.0 1.0"
          class="clickable raycastable"
          help-toggle
          visible="false"
          font="kelsonsans"
          shader="msdf">
        </a-text>
        
      </a-entity>
      ${!isMirrorPanel ? `</a-entity>` : ''}
    `;
  };

  // Generar el elemento de video con controles
  const generateVideoElement = () => {
    return `
      <!-- Contenedor del video -->
      <a-entity
        id="video-container"
        position="${position[0]} ${position[1]} ${position[2]}"
        rotation="${rotation[0]} ${rotation[1]} ${rotation[2]}">
        
        <!-- Video principal -->
        <a-entity
          id="vr-local-video-entity"
          vr-local-video="
            src: ${videoSrc};
            width: ${width};
            height: ${height};
            autoplay: ${autoplay};
            doubleSided: ${doubleSided};
            invertBackSide: ${invertBackSide};
            isMirrorPanel: ${isMirrorPanel};
            muteAudio: ${muteAudio};
            disableInteractions: ${disableInteractions}
          ">
        </a-entity>
        
      </a-entity>
    `;
  };

  // Script para cargar el componente vr-local-video
  const videoScript = `
    <script>
      // Componente para reproducir video local con barra de progreso
      // Este componente encapsula toda la funcionalidad para reproducir videos locales en A-Frame

      AFRAME.registerComponent('vr-local-video', {
        schema: {
          src: { type: 'string', default: '/videos/sample.mp4' },
          width: { type: 'number', default: 16 },
          height: { type: 'number', default: 9 },
          position: { type: 'vec3', default: { x: 0, y: 0, z: 0 } },
          rotation: { type: 'vec3', default: { x: 0, y: 0, z: 0 } },
          autoplay: { type: 'boolean', default: false },
          doubleSided: { type: 'boolean', default: true },
          invertBackSide: { type: 'boolean', default: true },
          isMirrorPanel: { type: 'boolean', default: false },
          muteAudio: { type: 'boolean', default: false },
          disableInteractions: { type: 'boolean', default: false }
        },

        init: function() {
          console.log('Iniciando componente vr-local-video', this.data);
          
          // Crear estructura de elementos
          this.createVideoElements();
          // Crear elemento de video principal
          this.video = document.createElement('video');
          this.video.crossOrigin = 'anonymous';
          this.video.loop = true;
          this.video.playsInline = true;
          this.video.setAttribute('playsinline', '');
          this.video.setAttribute('webkit-playsinline', '');
          
          // Configuración de audio - silenciar si es panel espejo
          if (this.data.autoplay === true || this.data.autoplay === 'true' || this.data.muteAudio) {
            this.video.muted = true;
            console.log('🔇 Video muteado:', this.data.muteAudio ? 'por configuración de espejo' : 'por autoplay');
          } else {
            this.video.muted = false;
          }
          
          // Configurar listeners solo si no está deshabilitado
          this.video.addEventListener('timeupdate', this.updateProgress.bind(this));
          if (!this.data.disableInteractions) {
            this.videoPlane.addEventListener('click', this.togglePlay.bind(this));
            this.progressBarBg.addEventListener('click', this.seekVideo.bind(this));
            if (this.backVideoPlane) {
              this.backVideoPlane.addEventListener('click', this.togglePlay.bind(this));
            }
          }
          
          // Cargar el video
          this.video.src = this.data.src;
          this.video.load();
          console.log('🎬 Video configurado:', {
            src: this.video.src,
            autoplay: this.data.autoplay,
            muted: this.video.muted,
            expectedState: this.data.autoplay ? 'will autoplay (muted)' : 'will be paused (unmuted)'
          });
          // Aplicar textura al plano frontal
          this.videoPlane.setAttribute('material', {
            shader: 'flat',
            src: this.video,
            side: this.data.doubleSided ? 'double' : 'front'
          });
          // Mostrar el primer frame y configurar estado inicial
          this.video.addEventListener('loadeddata', () => {
            this.video.currentTime = 0;
            // Solo pausar si autoplay está desactivado
            if (!this.data.autoplay) {
              this.video.pause();
            }
            if (this.videoPlane.components.material) {
              this.videoPlane.components.material.material.map.needsUpdate = true;
            }
            console.log('Video loadeddata: currentTime', this.video.currentTime, 'paused', this.video.paused, 'autoplay', this.data.autoplay);
          });
          // Solo intentar reproducir automáticamente si autoplay es true
          if (this.data.autoplay) {
            console.log('Intentando autoplay...');
            this.attemptAutoplay();
          } else {
            console.log('Autoplay está desactivado, no se reproduce automáticamente');
          }
        },
        
        initMirrorPanel: function() {
          console.log('🪞 Inicializando panel espejo para capturar TODO el contenido del panel principal');
          
          // NO crear video, solo un canvas para mostrar la copia
          this.mirrorCanvas = document.createElement('canvas');
          this.mirrorCanvas.width = 1280;
          this.mirrorCanvas.height = 720;
          this.mirrorCtx = this.mirrorCanvas.getContext('2d');
          
          // Crear plano para mostrar el canvas
          this.videoPlane = document.createElement('a-plane');
          this.videoPlane.setAttribute('width', this.data.width);
          this.videoPlane.setAttribute('height', this.data.height);
          this.videoPlane.setAttribute('material', {
            shader: 'flat',
            src: this.mirrorCanvas,
            side: this.data.doubleSided ? 'double' : 'front'
          });
          this.videoPlane.id = 'mirror-plane-' + Math.floor(Math.random() * 10000);
          
          this.el.appendChild(this.videoPlane);
          
          // Buscar el panel principal del DOM (elemento HTML del panel izquierdo)
          this.findPrimaryPanelDOM();
          
          // Iniciar bucle de captura del panel completo
          this.startDOMCapture();
          
          // Indicador visual de panel espejo
          const indicator = document.createElement('a-text');
          indicator.setAttribute('value', '🪞 PANEL ESPEJO');
          indicator.setAttribute('position', (this.data.width/2 - 1.5) + ' ' + (this.data.height/2 - 0.5) + ' 0.01');
          indicator.setAttribute('scale', '0.4 0.4 0.4');
          indicator.setAttribute('color', '#4CAF50');
          this.el.appendChild(indicator);
        },
        
        findPrimaryPanelDOM: function() {
          console.log('🔍 Buscando el panel principal del DOM...');
          
          // Estrategia 1: Buscar por clase o ID del panel izquierdo
          setTimeout(() => {
            // Buscar el contenedor del panel izquierdo en la página
            const leftPanel = window.parent.document.querySelector('.ar-panel:first-child') ||
                              window.parent.document.querySelector('[data-panel="left"]') ||
                              window.parent.document.querySelector('.ar-stereo-container > div:first-child > div');
            
            if (leftPanel) {
              this.primaryPanelElement = leftPanel;
              console.log('✅ Panel principal encontrado en DOM:', leftPanel);
              return;
            }
            
            // Estrategia 2: Buscar por posición o estructura
            const allPanels = window.parent.document.querySelectorAll('.ar-panel');
            if (allPanels.length >= 2) {
              this.primaryPanelElement = allPanels[0]; // Primer panel = izquierdo
              console.log('✅ Panel principal encontrado por posición:', allPanels[0]);
              return;
            }
            
            // Estrategia 3: Buscar contenedor de video
            const videoContainers = window.parent.document.querySelectorAll('div[style*="width"]');
            for (let container of videoContainers) {
              if (container.querySelector('video') || container.querySelector('iframe')) {
                this.primaryPanelElement = container;
                console.log('✅ Panel principal encontrado por contenido:', container);
                break;
              }
            }
            
            if (!this.primaryPanelElement) {
              console.warn('❌ No se pudo encontrar el panel principal');
              this.fallbackCapture();
            }
          }, 1000);
        },
        
        startDOMCapture: function() {
          console.log('🎬 Iniciando captura del DOM del panel principal...');
          
          // Iniciar bucle de captura a 30fps (más eficiente para captura DOM)
          this.domCaptureInterval = setInterval(() => {
            this.capturePrimaryPanel();
          }, 1000 / 30);
        },
        
        capturePrimaryPanel: function() {
          if (!this.primaryPanelElement || !this.mirrorCtx || !this.mirrorCanvas) {
            return;
          }
          
          try {
            // Captura manual del contenido
            this.captureManually();
          } catch (error) {
            console.warn('⚠️ Error en captura del panel:', error);
          }
        },
        
        captureManually: function() {
          // Limpiar canvas
          this.mirrorCtx.fillStyle = '#000000';
          this.mirrorCtx.fillRect(0, 0, this.mirrorCanvas.width, this.mirrorCanvas.height);
          
          // Buscar video en el panel principal
          const video = this.primaryPanelElement ? this.primaryPanelElement.querySelector('video') : null;
          if (video && video.readyState >= 2 && !video.paused) {
            try {
              this.mirrorCtx.drawImage(video, 0, 0, this.mirrorCanvas.width, this.mirrorCanvas.height);
            } catch (error) {
              console.warn('⚠️ Error dibujando video:', error);
            }
          }
          
          // Agregar texto indicativo
          this.mirrorCtx.fillStyle = '#4CAF50';
          this.mirrorCtx.font = '32px Arial';
          this.mirrorCtx.fillText('🪞 PANEL ESPEJO', 50, 50);
          this.mirrorCtx.fillStyle = '#FFFFFF';
          this.mirrorCtx.font = '24px Arial';
          this.mirrorCtx.fillText('Copiando del panel izquierdo...', 50, 100);
          
          // Actualizar textura
          if (this.videoPlane.components.material && this.videoPlane.components.material.material.map) {
            this.videoPlane.components.material.material.map.needsUpdate = true;
          }
        },
        
        fallbackCapture: function() {
          console.log('🔄 Usando método de captura de respaldo...');
          
          // Crear un video espejo básico como fallback
          this.fallbackVideo = document.createElement('video');
          this.fallbackVideo.crossOrigin = 'anonymous';
          this.fallbackVideo.loop = true;
          this.fallbackVideo.playsInline = true;
          this.fallbackVideo.muted = true; // Siempre muteado en el espejo
          this.fallbackVideo.src = this.data.src;
          
          // Aplicar al plano
          this.videoPlane.setAttribute('material', {
            shader: 'flat',
            src: this.fallbackVideo,
            side: this.data.doubleSided ? 'double' : 'front'
          });
          
          this.fallbackVideo.load();
          
          console.log('📺 Video de respaldo configurado (audio silenciado)');
        },
          // Crear canvas para capturar frames del panel principal
          this.mirrorCanvas = document.createElement('canvas');
          this.mirrorCanvas.width = 1280;
          this.mirrorCanvas.height = 720;
          this.mirrorCtx = this.mirrorCanvas.getContext('2d');
          
          // Intentar crossOrigin para evitar problemas de CORS
          this.mirrorCanvas.crossOrigin = 'anonymous';
          
          // Crear textura desde canvas
          this.videoPlane.setAttribute('material', {
            shader: 'flat',
            src: this.mirrorCanvas,
            side: this.data.doubleSided ? 'double' : 'front'
          });
          
          // Buscar el panel principal con reintentos
          this.findPrimaryPanelWithRetry();
        },
        
        findPrimaryPanelWithRetry: function() {
          let attempts = 0;
          const maxAttempts = 10;
          
          const tryFind = () => {
            attempts++;
            console.log('🔍 Intento', attempts, 'de encontrar panel principal');
            
            if (this.findPrimaryPanel()) {
              // Encontrado - iniciar bucle de captura
              this.startMirrorLoop();
              this.updateDebugInfo('✅ Panel principal encontrado');
            } else if (attempts < maxAttempts) {
              // Reintentar después de un delay
              setTimeout(tryFind, 1000);
              this.updateDebugInfo('⏳ Reintentando... (' + attempts + '/' + maxAttempts + ')');
            } else {
              // Usar método de fallback
              console.warn('⚠️ No se pudo encontrar panel principal, usando fallback');
              this.updateDebugInfo('⚠️ Usando modo fallback');
              this.useFallbackMirror();
            }
          };
          
          tryFind();
        },
        
        updateDebugInfo: function(message) {
          if (this.debugInfo) {
            this.debugInfo.setAttribute('value', message);
          }
        },
        
        findPrimaryPanel: function() {
          // Buscar el panel principal (sin isMirrorPanel)
          const primaryPanels = document.querySelectorAll('[vr-local-video]');
          for (let panel of primaryPanels) {
            const component = panel.components['vr-local-video'];
            if (component && !component.data.isMirrorPanel && component.video) {
              this.primaryVideo = component.video;
              this.primaryVideoPlane = component.videoPlane;
              console.log('🎯 Panel principal encontrado para sincronización:', {
                video: !!this.primaryVideo,
                videoSrc: this.primaryVideo?.src,
                videoPlane: !!this.primaryVideoPlane
              });
              return true;
            }
          }
          
          // Si no se encuentra inmediatamente, intentar de nuevo después de un delay
          console.warn('⚠️ Panel principal no encontrado, reintentando...');
          setTimeout(() => {
            this.findPrimaryPanel();
          }, 500);
          return false;
        },
        
        startMirrorLoop: function() {
          if (this.mirrorInterval) {
            clearInterval(this.mirrorInterval);
          }
          
          // Capturar a 60fps
          this.mirrorInterval = setInterval(() => {
            this.updateMirrorFrame();
          }, 1000 / 60);
          
          console.log('🔄 Bucle de espejo iniciado a 60fps');
        },
        
        updateMirrorFrame: function() {
          if (!this.primaryVideo || !this.mirrorCtx || !this.mirrorCanvas) {
            // Intentar encontrar el panel principal si no está disponible
            if (!this.primaryVideo) {
              this.findPrimaryPanel();
            }
            return;
          }
          
          try {
            // Verificar que el video esté listo
            if (this.primaryVideo.readyState >= 2) {
              // Limpiar canvas
              this.mirrorCtx.clearRect(0, 0, this.mirrorCanvas.width, this.mirrorCanvas.height);
              
              // Dibujar frame del video principal
              this.mirrorCtx.drawImage(
                this.primaryVideo, 
                0, 0, 
                this.mirrorCanvas.width, 
                this.mirrorCanvas.height
              );
              
              // Forzar actualización de textura en A-Frame
              if (this.videoPlane && this.videoPlane.components && this.videoPlane.components.material) {
                const material = this.videoPlane.components.material.material;
                if (material.map) {
                  material.map.needsUpdate = true;
                }
              }
              
              // Debug cada 60 frames (1 segundo aprox)
              this.frameCount = (this.frameCount || 0) + 1;
              if (this.frameCount % 60 === 0) {
                console.log('🪞 Espejo actualizado - Frame:', this.frameCount, {
                  videoTime: this.primaryVideo.currentTime.toFixed(2),
                  videoPaused: this.primaryVideo.paused,
                  canvasSize: this.mirrorCanvas.width + 'x' + this.mirrorCanvas.height
                });
              }
            }
          } catch (error) {
            console.warn('⚠️ Error actualizando frame del espejo:', error);
            // Reintentar encontrar el panel principal
            if (error.message.includes('cross-origin') || error.message.includes('tainted')) {
              console.warn('⚠️ Problema de CORS - usando método alternativo');
              this.useFallbackMirror();
            }
          }
        },
        
        useFallbackMirror: function() {
          // Método alternativo: usar la misma fuente de video pero silenciada
          console.log('🔄 Iniciando método fallback para panel espejo');
          
          if (!this.fallbackVideo) {
            this.fallbackVideo = document.createElement('video');
            this.fallbackVideo.crossOrigin = 'anonymous';
            this.fallbackVideo.src = this.data.src; // Usar la misma fuente
            this.fallbackVideo.muted = true; // SIEMPRE silenciado
            this.fallbackVideo.loop = true;
            this.fallbackVideo.playsInline = true;
            this.fallbackVideo.setAttribute('playsinline', '');
            this.fallbackVideo.setAttribute('webkit-playsinline', '');
            
            console.log('🎬 Video espejo creado:', {
              src: this.fallbackVideo.src,
              muted: this.fallbackVideo.muted
            });
            
            // Aplicar directamente al plano de video del espejo
            this.videoPlane.setAttribute('material', {
              shader: 'flat',
              src: this.fallbackVideo,
              side: this.data.doubleSided ? 'double' : 'front'
            });
            
            // Buscar panel principal para sincronización
            this.setupVideoSync();
            
            // Cargar el video
            this.fallbackVideo.load();
            this.updateDebugInfo('✅ Video espejo configurado');
          }
        },
        
        setupVideoSync: function() {
          // Buscar el video principal para sincronizar
          const findAndSync = () => {
            const primaryPanels = document.querySelectorAll('[vr-local-video]');
            for (let panel of primaryPanels) {
              const component = panel.components['vr-local-video'];
              if (component && !component.data.isMirrorPanel && component.video) {
                this.primaryVideo = component.video;
                console.log('🎯 Panel principal encontrado para sincronización de fallback');
                
                // Configurar eventos de sincronización
                this.setupSyncEvents();
                return true;
              }
            }
            return false;
          };
          
          if (!findAndSync()) {
            // Reintentar después de un delay
            setTimeout(findAndSync, 1000);
          }
        },
        
        setupSyncEvents: function() {
          if (!this.primaryVideo || !this.fallbackVideo) return;
          
          // Sincronizar reproducción
          this.primaryVideo.addEventListener('play', () => {
            if (this.fallbackVideo && this.fallbackVideo.paused) {
              this.fallbackVideo.currentTime = this.primaryVideo.currentTime;
              this.fallbackVideo.play().catch(e => console.warn('Error al sincronizar play:', e));
            }
          });
          
          // Sincronizar pausa
          this.primaryVideo.addEventListener('pause', () => {
            if (this.fallbackVideo && !this.fallbackVideo.paused) {
              this.fallbackVideo.pause();
            }
          });
          
          // Sincronizar búsqueda
          this.primaryVideo.addEventListener('seeked', () => {
            if (this.fallbackVideo && Math.abs(this.fallbackVideo.currentTime - this.primaryVideo.currentTime) > 0.5) {
              this.fallbackVideo.currentTime = this.primaryVideo.currentTime;
            }
          });
          
          // Sincronización periódica más agresiva
          this.syncInterval = setInterval(() => {
            if (this.primaryVideo && this.fallbackVideo) {
              const timeDiff = Math.abs(this.fallbackVideo.currentTime - this.primaryVideo.currentTime);
              
              // Si hay desincronización mayor a 0.2 segundos, corregir
              if (timeDiff > 0.2) {
                this.fallbackVideo.currentTime = this.primaryVideo.currentTime;
              }
              
              // Sincronizar estado de reproducción
              if (this.primaryVideo.paused !== this.fallbackVideo.paused) {
                if (this.primaryVideo.paused) {
                  this.fallbackVideo.pause();
                } else {
                  this.fallbackVideo.play().catch(e => console.warn('Error en sync automático:', e));
                }
              }
            }
          }, 200); // Cada 200ms
          
          console.log('🔄 Eventos de sincronización configurados');
        },
        
        createVideoElements: function() {
          const el = this.el;
          
          // Crear plano principal para el video
          this.videoPlane = document.createElement('a-plane');
          this.videoPlane.setAttribute('width', this.data.width);
          this.videoPlane.setAttribute('height', this.data.height);
          this.videoPlane.setAttribute('material', 'shader: flat');
          this.videoPlane.classList.add('clickable');
          this.videoPlane.id = 'video-plane-' + Math.floor(Math.random() * 10000);
          
          // Contenedor para barra de progreso
          const progressContainer = document.createElement('a-entity');
          progressContainer.setAttribute('position', '0 ' + (-this.data.height/2 - 0.5) + ' 0.01');
          
          // Fondo de la barra de progreso
          this.progressBarBg = document.createElement('a-plane');
          this.progressBarBg.setAttribute('width', this.data.width);
          this.progressBarBg.setAttribute('height', 0.5);
          this.progressBarBg.setAttribute('material', 'color: #444444; shader: flat');
          this.progressBarBg.classList.add('clickable');
          
          // Barra de progreso
          this.progressBar = document.createElement('a-plane');
          this.progressBar.setAttribute('width', 0);
          this.progressBar.setAttribute('height', 0.5);
          this.progressBar.setAttribute('position', (-this.data.width/2) + ' 0 0.01');
          this.progressBar.setAttribute('material', 'color: #FF0000; shader: flat');
          
          // Indicador de tiempo
          this.timeDisplay = document.createElement('a-text');
          this.timeDisplay.setAttribute('value', '0:00 / 0:00');
          this.timeDisplay.setAttribute('position', '0 0.7 0');
          this.timeDisplay.setAttribute('align', 'center');
          this.timeDisplay.setAttribute('color', 'white');
          this.timeDisplay.setAttribute('scale', '1 1 1');
          
          // Ensamblar estructura
          progressContainer.appendChild(this.progressBarBg);
          progressContainer.appendChild(this.progressBar);
          progressContainer.appendChild(this.timeDisplay);
          
          el.appendChild(this.videoPlane);
          el.appendChild(progressContainer);
        },
        
        formatTime: function(seconds) {
          if (!seconds || isNaN(seconds)) return "0:00";
          const minutes = Math.floor(seconds / 60);
          seconds = Math.floor(seconds % 60);
          return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
        },
        
        updateProgress: function() {
          if (!this.video || !this.video.duration || isNaN(this.video.duration)) {
            return;
          }
          
          const progress = this.video.currentTime / this.video.duration;
          if (isNaN(progress)) return;
          
          const barWidth = this.data.width * progress;
          const position = -this.data.width/2 + (barWidth / 2);
          
          this.progressBar.setAttribute('width', barWidth);
          this.progressBar.setAttribute('position', position + ' 0 0.01');
          
          const timeText = this.formatTime(this.video.currentTime) + ' / ' + this.formatTime(this.video.duration);
          this.timeDisplay.setAttribute('value', timeText);
        },
        
        seekVideo: function(event) {
          if (!this.video || !this.video.duration) return;
          
          try {
            const mousePos = event.detail.intersection.point;
            const progressWidth = this.data.width;
            const progressStart = -this.data.width/2;
            
            const clickPos = (mousePos.x - progressStart) / progressWidth;
            const seekTime = this.video.duration * Math.max(0, Math.min(1, clickPos));
            
            if (isFinite(seekTime) && !isNaN(seekTime)) {
              this.video.currentTime = seekTime;
              console.log("Seeking to", seekTime, "seconds");
            }
          } catch (error) {
            console.error("Error al buscar posición en el video:", error);
          }
        },
        
        togglePlay: function() {
          if (!this.video) return;
          
          try {
            if (this.video.muted) {
              this.video.muted = false;
              console.log("Video unmuted");
            } else if (this.video.paused) {
              this.video.play()
                .then(() => console.log("Video reproduciendo"))
                .catch(err => console.error("Error al reproducir:", err));
            } else {
              this.video.pause();
              console.log("Video pausado");
            }
          } catch (error) {
            console.error("Error al controlar la reproducción:", error);
          }
        },
        
        attemptAutoplay: function() {
          if (!this.data.autoplay) {
            console.log('Autoplay deshabilitado por configuración - Video permanece pausado');
            return;
          }
          console.log('Llamando video.play() para autoplay...');
          const playPromise = this.video.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('Autoplay exitoso - Video reproduciendo (muted):', 'paused:', this.video.paused, 'muted:', this.video.muted);
                // Después de 2 segundos, activar audio si sigue reproduciendo
                setTimeout(() => {
                  if (this.video && !this.video.paused) {
                    this.video.muted = false;
                    console.log('Audio activado automáticamente después de 2 segundos');
                  }
                }, 2000);
              })
              .catch(error => {
                console.warn('Error en autoplay - Video permanece pausado:', error);
                // Si falla autoplay, asegurar que quede pausado
                this.video.pause();
              });
          } else {
            console.warn('video.play() no devolvió promesa');
          }
        },

        remove: function() {
          // Limpiar panel espejo si existe
          if (this.domCaptureInterval) {
            clearInterval(this.domCaptureInterval);
            console.log('🔄 Captura DOM detenida');
          }
          
          if (this.mirrorInterval) {
            clearInterval(this.mirrorInterval);
            console.log('🔄 Bucle de espejo detenido');
          }
          
          // Limpiar intervalo de sincronización
          if (this.syncInterval) {
            clearInterval(this.syncInterval);
            console.log('🔄 Sincronización detenida');
          }
          
          if (this.mirrorCanvas) {
            this.mirrorCtx = null;
            this.mirrorCanvas = null;
          }
          
          // Limpiar video de fallback
          if (this.fallbackVideo) {
            this.fallbackVideo.pause();
            this.fallbackVideo.src = '';
            this.fallbackVideo = null;
          }
            this.fallbackVideo.src = '';
            this.fallbackVideo.load();
            this.fallbackVideo = null;
            console.log('🔄 Video fallback limpiado');
          }
          
          // Limpiar video principal
          if (this.video) {
            this.video.pause();
            this.video.src = '';
            this.video.load();
            this.video = null;
          }
          
          console.log('Componente vr-local-video removido correctamente');
        }
      });

      console.log('Componente vr-local-video registrado correctamente');

      // Componente para controles de voz
      AFRAME.registerComponent('voice-control', {
        schema: {
          enabled: { type: 'boolean', default: false }, // Siempre false por defecto
          videoEntity: { type: 'string', default: '' },
          isMirrorPanel: { type: 'boolean', default: false } // Nueva prop
        },

        init: function() {
          // Si es un panel espejo, no inicializar control de voz
          if (this.data.isMirrorPanel) {
            console.log('🪞 Panel espejo - Control de voz deshabilitado');
            return;
          }
          
          console.log('🎤 Iniciando control de voz');
          
          this.isListening = false;
          this.recognition = null;
          this.videoComponent = null;
          
          // Forzar enabled a false al inicio
          this.data.enabled = false;
          
          // Buscar el componente de video
          this.findVideoComponent();
          
          // Configurar reconocimiento de voz
          this.setupSpeechRecognition();
          
          // Forzar estado visual desactivado (rojo y OFF) sin delay
          setTimeout(() => {
            this.forceDisabledState();
          }, 500);
          
          // NO iniciar escucha automáticamente
        },
        
        forceDisabledState: function() {
          const micIcon = document.querySelector('#mic-icon');
          const micStatus = document.querySelector('#mic-status');
          const micCircle = micIcon ? micIcon.querySelector('a-circle') : null;
          
          if (micCircle && micStatus) {
            // Forzar estado desactivado
            micCircle.setAttribute('material', 'color: #F44336; shader: flat; opacity: 0.9');
            micCircle.removeAttribute('animation');
            micCircle.setAttribute('scale', '1 1 1');
            micStatus.setAttribute('value', 'OFF');
            micStatus.setAttribute('color', '#FFB3B3');
            
            console.log('🎤 Estado inicial forzado: DESACTIVADO - Rojo/OFF');
          }
        },

        findVideoComponent: function() {
          const videoEntity = document.querySelector('#' + this.data.videoEntity);
          if (videoEntity) {
            this.videoComponent = videoEntity.components['vr-local-video'];
            console.log('🎤 Componente de video encontrado');
          } else {
            console.warn('🎤 No se encontró el componente de video');
          }
        },

        setupSpeechRecognition: function() {
          if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('🎤 Reconocimiento de voz no soportado');
            this.updateVoiceText('❌ Reconocimiento de voz no disponible');
            return;
          }

          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          this.recognition = new SpeechRecognition();
          
          this.recognition.continuous = true;
          this.recognition.interimResults = true;
          this.recognition.lang = 'es-ES';
          
          this.recognition.onstart = () => {
            console.log('🎤 Reconocimiento iniciado');
            this.isListening = true;
            this.updateListeningIndicator('🎙️ Escuchando..');
            
            // Suprimir sonidos del sistema
            this.suppressSystemSounds();
          };
          
          this.recognition.onend = () => {
            console.log('🎤 Reconocimiento terminado');
            this.isListening = false;
            this.updateListeningIndicator('');
            
            // Suprimir sonidos del sistema
            this.suppressSystemSounds();
            
            // NO reiniciar automáticamente - solo activación manual
          };
          
          this.recognition.onerror = (event) => {
            console.error('🎤 Error en reconocimiento:', event.error);
            this.updateListeningIndicator('❌ Error: ' + event.error);
            
            // Suprimir sonidos del sistema
            this.suppressSystemSounds();
          };
          
          this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalTranscript += transcript;
              } else {
                interimTranscript += transcript;
              }
            }
            
            // Mostrar texto reconocido
            const displayText = finalTranscript || interimTranscript;
            this.updateVoiceText('🎧 "' + displayText + '"');
            
            // Procesar comandos finales
            if (finalTranscript) {
              this.processVoiceCommand(finalTranscript.toLowerCase());
            }
          };
        },

        processVoiceCommand: function(command) {
          console.log('🎤 Procesando comando:', command);
          
          if (!this.videoComponent) {
            console.warn('🎤 No hay componente de video para controlar');
            return;
          }

          // Comandos de reproducción
          if (command.includes('play') || command.includes('reproducir') || command.includes('reproduce')) {
            console.log('🎤 Comando: Play');
            this.updateVoiceText('▶️ Reproduciendo video');
            if (this.videoComponent.video && this.videoComponent.video.paused) {
              this.videoComponent.togglePlay();
            }
          }
          // Comandos de pausa
          else if (command.includes('pause') || command.includes('pausar') || command.includes('pausa')) {
            console.log('🎤 Comando: Pause');
            this.updateVoiceText('⏸️ Video pausado');
            if (this.videoComponent.video && !this.videoComponent.video.paused) {
              this.videoComponent.togglePlay();
            }
          }
          // Comando de parar
          else if (command.includes('stop') || command.includes('parar') || command.includes('detener')) {
            console.log('🎤 Comando: Stop');
            this.updateVoiceText('⏹️ Video detenido');
            if (this.videoComponent.video) {
              this.videoComponent.video.pause();
              this.videoComponent.video.currentTime = 0;
            }
          }
          // Comando de silenciar
          else if (command.includes('mute') || command.includes('silenciar') || command.includes('sin sonido')) {
            console.log('🎤 Comando: Mute');
            this.updateVoiceText('🔇 Audio silenciado');
            if (this.videoComponent.video) {
              this.videoComponent.video.muted = true;
            }
          }
          // Comando de activar sonido
          else if (command.includes('unmute') || command.includes('activar sonido') || command.includes('sonido')) {
            console.log('🎤 Comando: Unmute');
            this.updateVoiceText('🔊 Audio activado');
            if (this.videoComponent.video) {
              this.videoComponent.video.muted = false;
            }
          }
        },

        updateVoiceText: function(text) {
          const voiceTextEl = document.querySelector('#voice-text');
          if (voiceTextEl) {
            voiceTextEl.setAttribute('value', text);
          }
        },

        updateListeningIndicator: function(text) {
          const indicatorEl = document.querySelector('#listening-indicator');
          const helpIconEl = document.querySelector('#help-icon');
          if (indicatorEl) {
            indicatorEl.setAttribute('value', text);
            indicatorEl.setAttribute('visible', text !== '');
            
            // Mostrar/ocultar icono de ayuda junto con el indicador
            if (helpIconEl) {
              helpIconEl.setAttribute('visible', text !== '');
            }
          }
        },

        suppressSystemSounds: function() {
          // Suprimir sonidos del sistema de Chrome para reconocimiento de voz
          try {
            // Desactivar sonidos de notificación del navegador
            if (typeof speechSynthesis !== 'undefined') {
              speechSynthesis.cancel();
            }
            
            // Intentar silenciar contexto de audio temporal
            if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
              const AudioCtx = AudioContext || webkitAudioContext;
              if (this.tempAudioContext) {
                this.tempAudioContext.close();
              }
              this.tempAudioContext = new AudioCtx();
              this.tempAudioContext.suspend();
            }
            
            console.log('🔇 Sonidos del sistema suprimidos');
          } catch (error) {
            console.warn('⚠️ No se pudieron suprimir todos los sonidos del sistema:', error);
          }
        },

        startListening: function() {
          if (!this.recognition) {
            console.warn('🎤 Reconocimiento no disponible');
            return;
          }
          
          if (!this.isListening) {
            try {
              this.recognition.start();
            } catch (error) {
              console.error('🎤 Error al iniciar:', error);
            }
          }
        },

        stopListening: function() {
          if (this.recognition && this.isListening) {
            this.recognition.stop();
          }
        },

        toggleListening: function() {
          if (this.isListening) {
            this.stopListening();
            this.data.enabled = false;
          } else {
            this.startListening();
            this.data.enabled = true;
          }
          this.updateMicIcon();
        },

        updateMicIcon: function() {
          const micIconEl = document.querySelector('#mic-icon');
          const micStatusEl = document.querySelector('#mic-status');
          const micCircle = micIconEl ? micIconEl.querySelector('a-circle') : null;
          if (micIconEl && micStatusEl && micCircle) {
            if (this.data.enabled) {
              micCircle.setAttribute('material', 'color: #4CAF50; shader: flat; opacity: 0.9');
              micStatusEl.setAttribute('value', 'ON');
              micStatusEl.setAttribute('color', 'white');
            } else {
              micCircle.setAttribute('material', 'color: #F44336; shader: flat; opacity: 0.9');
              micStatusEl.setAttribute('value', 'OFF');
              micStatusEl.setAttribute('color', '#FFB3B3');
            }
          }
        },

        remove: function() {
          if (this.recognition) {
            this.recognition.stop();
            this.recognition = null;
          }
          console.log('🎤 Control de voz removido');
        }
      });

      // Componente para el icono del micrófono (solo click, sin gaze)
      AFRAME.registerComponent('mic-icon', {
        init: function() {
          this.el.addEventListener('click', this.toggleVoice.bind(this));
          this.el.addEventListener('touchstart', this.onTouchStart.bind(this));
          this.el.addEventListener('touchend', this.onTouchEnd.bind(this));
          this.el.setAttribute('geometry', { primitive: 'circle', radius: 0.6 });
          this.el.classList.add('clickable', 'raycastable');
          this.el.setAttribute('material', 'transparent: true; opacity: 0.01');
        },
        onTouchStart: function(event) {
          event.preventDefault();
          this.touchStarted = true;
        },
        onTouchEnd: function(event) {
          event.preventDefault();
          if (this.touchStarted) {
            this.toggleVoice();
            this.touchStarted = false;
          }
        },
        toggleVoice: function() {
          const voiceControlEl = document.querySelector('[voice-control]');
          if (voiceControlEl && voiceControlEl.components['voice-control']) {
            voiceControlEl.components['voice-control'].toggleListening();
          }
        }
      });

      // Componente para el icono de ayuda
      AFRAME.registerComponent('help-toggle', {
        init: function() {
          this.el.addEventListener('click', this.toggleHelp.bind(this));
          this.el.addEventListener('touchstart', this.onTouchStart.bind(this));
          this.el.addEventListener('touchend', this.onTouchEnd.bind(this));
          this.el.setAttribute('geometry', { primitive: 'circle', radius: 0.5 });
          this.el.classList.add('clickable', 'raycastable');
          this.el.setAttribute('material', 'transparent: true; opacity: 0.01');
          this.helpVisible = false;
        },
        onTouchStart: function(event) {
          event.preventDefault();
          this.touchStarted = true;
        },
        onTouchEnd: function(event) {
          event.preventDefault();
          if (this.touchStarted) {
            this.toggleHelp();
            this.touchStarted = false;
          }
        },
        toggleHelp: function() {
          const voiceTextEl = document.querySelector('#voice-text');
          if (voiceTextEl) {
            this.helpVisible = !this.helpVisible;
            voiceTextEl.setAttribute('visible', this.helpVisible);
            console.log('🎤 Ayuda de comandos:', this.helpVisible ? 'MOSTRADA' : 'OCULTA');
          }
        }
      });

      console.log('🎤 Componentes de control de voz registrados');
      
      // Script adicional para mejorar la interacción con mouse en modo web
      document.addEventListener('DOMContentLoaded', function() {
        console.log('🖱️ Configurando interacción de mouse');
        
        // Asegurar que los elementos clickeables respondan al mouse
        const clickableElements = document.querySelectorAll('.clickable, .raycastable');
        clickableElements.forEach(el => {
          el.style.cursor = 'pointer';
          
          // Agregar eventos de mouse adicionales
          el.addEventListener('mouseenter', function() {
            console.log('🖱️ Mouse sobre elemento clickeable');
          });
          
          el.addEventListener('mouseleave', function() {
            console.log('🖱️ Mouse fuera de elemento clickeable');
          });
        });
      });
    </script>
  `;

  const srcDoc = `
    <html>
      <head>
        <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
        ${videoScript}
      </head>
      <body style="margin:0; background:transparent;">
        <a-scene 
          embedded 
          vr-mode-ui="enabled: false" 
          stats="false"
          style="width: 100vw; height: 100vh; background: transparent;">
          
          ${generateVideoElement()}
          ${generateMarker()}
          ${generateVoiceControls()}
          
          <!-- Cámara con cursor condicional -->
          <a-camera position="0 1.8 0" rotation="0 0 0">
            ${showCursor ? `
            <!-- Cursor único para toda la interacción -->
            <a-cursor
              id="main-cursor"
              position="0 0 -1"
              geometry="primitive: ring; radiusInner: 0.02; radiusOuter: 0.03"
              material="color: white; shader: flat; opacity: 0.8"
              animation__click="property: scale; startEvents: click; from: 0.1 0.1 0.1; to: 1 1 1; dur: 150"
              animation__fusing="property: scale; startEvents: fusing; from: 1 1 1; to: 0.1 0.1 0.1; dur: 1500"
              animation__mouseleave="property: scale; startEvents: mouseleave; to: 1 1 1; dur: 500"
              raycaster="objects: .clickable, .raycastable; far: 20; interval: 1000"
              fuse="true"
              fuse-timeout="1500">
            </a-cursor>
            ` : ''}
          </a-camera>
        </a-scene>
      </body>
    </html>
  `;

  return (
    <iframe
      title="VR Local Video Overlay"
      srcDoc={srcDoc}
      style={{ 
        width: '100%', 
        height: '100%', 
        border: 'none', 
        background: 'transparent', 
        pointerEvents: 'auto' 
      }}
      allow="autoplay; fullscreen; microphone"
    />
  );
};

export default VRLocalVideoOverlay;
