import React from 'react';

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
  autoplay = true,
  doubleSided = true,
  invertBackSide = true,
  showMarker = true,
  enableVoiceCommands = true,
  voiceCommandsActivated = true,
  ...props 
}) => {
  
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
      <!-- Controles de voz -->
      <a-entity
        id="voice-controls"
        position="${position[0]} ${position[1] - height/2 - 2.5} ${position[2]}"
        voice-control="
          enabled: ${voiceCommandsActivated};
          videoEntity: vr-local-video-entity
        ">
        
        <!-- Icono de micrófono -->
        <a-entity
          id="mic-icon"
          position="0 0 0.01"
          class="clickable raycastable"
          mic-icon
          gaze-toggle>
          
          <!-- Fondo circular del micrófono -->
          <a-circle
            radius="1.2"
            material="color: #4CAF50; shader: flat; opacity: 0.9"
            animation="property: scale; to: 1.1 1.1 1.1; dir: alternate; dur: 800; loop: true; easing: easeInOutQuad">
          </a-circle>
          
          <!-- Indicador de progreso de mirada (inicialmente invisible) -->
          <a-ring
            id="gaze-progress"
            radius-inner="1.3"
            radius-outer="1.4"
            theta-start="0"
            theta-length="0"
            position="0 0 0.01"
            material="color: #FFD700; shader: flat; opacity: 0.8"
            visible="false">
          </a-ring>
          
          <!-- Símbolo del micrófono usando geometría -->
          <a-cylinder
            radius="0.3"
            height="0.6"
            position="0 0.2 0.02"
            material="color: white; shader: flat">
          </a-cylinder>
          
          <!-- Base del micrófono -->
          <a-cylinder
            radius="0.5"
            height="0.1"
            position="0 -0.3 0.02"
            material="color: white; shader: flat">
          </a-cylinder>
          
          <!-- Pie del micrófono -->
          <a-cylinder
            radius="0.05"
            height="0.4"
            position="0 -0.1 0.02"
            material="color: white; shader: flat">
          </a-cylinder>
          
          <!-- Indicador de estado -->
          <a-text
            id="mic-status"
            value="ON"
            position="0 -0.8 0.03"
            align="center"
            color="white"
            scale="0.8 0.8 0.8">
          </a-text>
          
        </a-entity>
        
        <!-- Texto de reconocimiento de voz -->
        <a-text
          id="voice-text"
          value="🎤 Comandos: 'play', 'pause', 'reproducir', 'pausar'"
          position="0 -2.0 0"
          align="center"
          color="white"
          scale="1.2 1.2 1.2"
          width="8">
        </a-text>
        
        <!-- Indicador de escucha -->
        <a-text
          id="listening-indicator"
          value=""
          position="0 -3.2 0"
          align="center"
          color="#FF9800"
          scale="1.5 1.5 1.5"
          width="6"
          visible="false">
        </a-text>
        
      </a-entity>
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
            invertBackSide: ${invertBackSide}
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
          invertBackSide: { type: 'boolean', default: true }
        },

        init: function() {
          console.log('Iniciando componente vr-local-video');
          
          // Crear estructura de elementos
          this.createVideoElements();
          
          // Crear elemento de video principal
          this.video = document.createElement('video');
          this.video.crossOrigin = 'anonymous';
          this.video.loop = true;
          this.video.muted = true;
          this.video.playsInline = true;
          this.video.setAttribute('playsinline', '');
          this.video.setAttribute('webkit-playsinline', '');
          
          // Configurar listeners
          this.video.addEventListener('timeupdate', this.updateProgress.bind(this));
          this.videoPlane.addEventListener('click', this.togglePlay.bind(this));
          this.progressBarBg.addEventListener('click', this.seekVideo.bind(this));
          
          // Si tenemos video trasero invertido, sincronizamos los eventos de clic
          if (this.backVideoPlane) {
            this.backVideoPlane.addEventListener('click', this.togglePlay.bind(this));
          }
          
          // Cargar el video
          this.video.src = this.data.src;
          this.video.load();
          
          // Aplicar textura al plano frontal
          this.videoPlane.setAttribute('material', {
            shader: 'flat',
            src: this.video,
            side: this.data.doubleSided ? 'double' : 'front'
          });
          
          // Intentar reproducir automáticamente
          this.attemptAutoplay();
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
            console.log("Autoplay deshabilitado por configuración");
            return;
          }
          
          console.log("Intentando autoplay...");
          const playPromise = this.video.play();
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log("Autoplay funcionando (muted)");
                // Desactivar mute después de 2 segundos para permitir audio
                setTimeout(() => {
                  if (this.video && !this.video.paused) {
                    this.video.muted = false;
                    console.log("Audio activado automáticamente");
                  }
                }, 2000);
              })
              .catch(error => {
                console.warn("Error en autoplay:", error);
              });
          }
        },

        remove: function() {
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
          enabled: { type: 'boolean', default: true },
          videoEntity: { type: 'string', default: '' }
        },

        init: function() {
          console.log('🎤 Iniciando control de voz');
          
          this.isListening = false;
          this.recognition = null;
          this.videoComponent = null;
          
          // Buscar el componente de video
          this.findVideoComponent();
          
          // Configurar reconocimiento de voz
          this.setupSpeechRecognition();
          
          // Configurar icono inicial con un delay para asegurar que el DOM esté listo
          setTimeout(() => {
            console.log('🎤 Verificando elementos del DOM:');
            const micIcon = document.querySelector('#mic-icon');
            const micStatus = document.querySelector('#mic-status');
            const voiceText = document.querySelector('#voice-text');
            
            console.log('🎤 Elementos encontrados:', {
              micIcon: !!micIcon,
              micStatus: !!micStatus,
              voiceText: !!voiceText
            });
            
            this.updateMicIcon();
            console.log('🎤 Icono inicializado');
          }, 1000);
          
          // Iniciar escucha si está habilitado
          if (this.data.enabled) {
            setTimeout(() => this.startListening(), 1500);
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
            this.updateListeningIndicator('🎙️ Escuchando...');
          };
          
          this.recognition.onend = () => {
            console.log('🎤 Reconocimiento terminado');
            this.isListening = false;
            this.updateListeningIndicator('');
            
            // Reiniciar automáticamente si está habilitado
            if (this.data.enabled) {
              setTimeout(() => this.startListening(), 1000);
            }
          };
          
          this.recognition.onerror = (event) => {
            console.error('🎤 Error en reconocimiento:', event.error);
            this.updateListeningIndicator('❌ Error: ' + event.error);
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
          if (indicatorEl) {
            indicatorEl.setAttribute('value', text);
            indicatorEl.setAttribute('visible', text !== '');
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
              // Micrófono activo - Verde con animación
              micCircle.setAttribute('material', 'color: #4CAF50; shader: flat; opacity: 0.9');
              micCircle.setAttribute('animation', 'property: scale; to: 1.1 1.1 1.1; dir: alternate; dur: 800; loop: true; easing: easeInOutQuad');
              micStatusEl.setAttribute('value', 'ON');
              micStatusEl.setAttribute('color', 'white');
              console.log('🎤 Micrófono ACTIVADO - Verde');
            } else {
              // Micrófono desactivado - Rojo sin animación
              micCircle.setAttribute('material', 'color: #F44336; shader: flat; opacity: 0.8');
              micCircle.removeAttribute('animation');
              micCircle.setAttribute('scale', '1 1 1');
              micStatusEl.setAttribute('value', 'OFF');
              micStatusEl.setAttribute('color', '#FFB3B3');
              console.log('🎤 Micrófono DESACTIVADO - Rojo');
            }
          } else {
            console.warn('🎤 No se encontraron elementos del micrófono:', {
              micIcon: !!micIconEl,
              micStatus: !!micStatusEl,
              micCircle: !!micCircle
            });
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

      // Componente para el icono del micrófono
      AFRAME.registerComponent('mic-icon', {
        init: function() {
          this.el.addEventListener('click', () => {
            const voiceControlEl = document.querySelector('[voice-control]');
            if (voiceControlEl && voiceControlEl.components['voice-control']) {
              voiceControlEl.components['voice-control'].toggleListening();
            }
          });
        }
      });

      // Componente para control por mirada (gaze)
      AFRAME.registerComponent('gaze-toggle', {
        init: function() {
          this.gazeTimer = null;
          this.gazeProgress = 0;
          this.isGazing = false;
          this.progressRing = this.el.querySelector('#gaze-progress');
          
          // Configurar eventos del raycaster
          this.el.addEventListener('mouseenter', this.onGazeStart.bind(this));
          this.el.addEventListener('mouseleave', this.onGazeEnd.bind(this));
          
          console.log('🎯 Componente gaze-toggle inicializado');
        },

        onGazeStart: function() {
          console.log('👁️ Iniciando mirada en micrófono');
          this.isGazing = true;
          this.gazeProgress = 0;
          
          // Mostrar anillo de progreso
          if (this.progressRing) {
            this.progressRing.setAttribute('visible', true);
            this.progressRing.setAttribute('theta-length', 0);
          }
          
          // Iniciar timer de progreso
          this.startGazeProgress();
        },

        onGazeEnd: function() {
          console.log('👁️ Terminando mirada en micrófono');
          this.isGazing = false;
          this.gazeProgress = 0;
          
          // Ocultar anillo de progreso
          if (this.progressRing) {
            this.progressRing.setAttribute('visible', false);
          }
          
          // Limpiar timer
          if (this.gazeTimer) {
            clearInterval(this.gazeTimer);
            this.gazeTimer = null;
          }
        },

        startGazeProgress: function() {
          const duration = 3000; // 3 segundos
          const interval = 50; // Actualizar cada 50ms
          const increment = (360 / duration) * interval; // Grados por intervalo
          
          this.gazeTimer = setInterval(() => {
            if (!this.isGazing) {
              clearInterval(this.gazeTimer);
              return;
            }
            
            this.gazeProgress += increment;
            
            // Actualizar anillo de progreso
            if (this.progressRing) {
              this.progressRing.setAttribute('theta-length', this.gazeProgress);
            }
            
            // Si completó los 3 segundos, activar toggle
            if (this.gazeProgress >= 360) {
              console.log('✅ Gaze completo - Cambiando estado del micrófono');
              this.toggleMicrophone();
              this.onGazeEnd(); // Resetear estado
            }
          }, interval);
        },

        toggleMicrophone: function() {
          const voiceControlEl = document.querySelector('[voice-control]');
          if (voiceControlEl && voiceControlEl.components['voice-control']) {
            voiceControlEl.components['voice-control'].toggleListening();
            
            // Feedback visual de activación
            this.showActivationFeedback();
          }
        },

        showActivationFeedback: function() {
          // Crear efecto de flash para confirmar la activación
          const micIcon = this.el;
          const originalScale = micIcon.getAttribute('scale') || '1 1 1';
          
          // Efecto de pulse
          micIcon.setAttribute('animation__feedback', {
            property: 'scale',
            to: '1.3 1.3 1.3',
            dur: 200,
            dir: 'alternate',
            loop: 2,
            easing: 'easeInOutQuad'
          });
          
          // Restaurar escala original después del efecto
          setTimeout(() => {
            micIcon.removeAttribute('animation__feedback');
            micIcon.setAttribute('scale', originalScale);
          }, 600);
        },

        remove: function() {
          if (this.gazeTimer) {
            clearInterval(this.gazeTimer);
          }
        }
      });

      console.log('🎤 Componentes de control de voz registrados');
    </script>
  `;

  const srcDoc = `
    <html>
      <head>
        <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
        ${videoScript}
      </head>
      <body style="margin:0; background:transparent;">
        <a-scene embedded vr-mode-ui="enabled: false" style="width: 100vw; height: 100vh; background: transparent;">
          ${generateVideoElement()}
          ${generateMarker()}
          ${generateVoiceControls()}
          <!-- Cámara a altura de persona -->
          <a-camera position="0 1.8 0" rotation="0 0 0"></a-camera>
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
