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
  autoplay = false, // Cambiado de true a false por defecto
  doubleSided = true,
  invertBackSide = true,
  showMarker = true,
  enableVoiceCommands = true,
  voiceCommandsActivated = false, // Siempre false por defecto
  showCursor = true, // Nueva prop para controlar si se muestra el cursor
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
          console.log('Iniciando componente vr-local-video', this.data);
          
          // Crear ID único para el video
          this.videoId = 'video-' + Math.floor(Math.random() * 100000);
          console.log('Video ID único:', this.videoId);
          
          // Crear estructura de elementos
          this.createVideoElements();
          // Crear elemento de video principal
          this.video = document.createElement('video');
          this.video.id = this.videoId;
          this.video.crossOrigin = 'anonymous';
          this.video.loop = true;
          this.video.playsInline = true;
          this.video.setAttribute('playsinline', '');
          this.video.setAttribute('webkit-playsinline', '');
          
          // Agregar el video al DOM para que A-Frame pueda accederlo
          document.body.appendChild(this.video);
          console.log('Video agregado al DOM con ID:', this.videoId);
          // Solo mutear si autoplay está activado
          // Verificar autoplay más estrictamente (puede venir como boolean o string)
          const isAutoplayEnabled = this.data.autoplay === true || this.data.autoplay === 'true';
          if (isAutoplayEnabled) {
            this.video.muted = true;
            console.log('🔇 Video muteado porque autoplay está ACTIVADO:', this.data.autoplay);
          } else {
            this.video.muted = false;
            console.log('🔊 Video NO muteado porque autoplay está DESACTIVADO:', this.data.autoplay);
          }
          // Configurar listeners
          this.video.addEventListener('timeupdate', this.updateProgress.bind(this));
          this.videoPlane.addEventListener('click', this.togglePlay.bind(this));
          this.progressBarBg.addEventListener('click', this.seekVideo.bind(this));
          if (this.backVideoPlane) {
            this.backVideoPlane.addEventListener('click', this.togglePlay.bind(this));
          }
          // Cargar el video
          this.video.src = this.data.src;
          this.video.load();
          console.log('🎬 Video configurado:', {
            src: this.video.src,
            autoplay: this.data.autoplay,
            'autoplay (type)': typeof this.data.autoplay,
            muted: this.video.muted,
            'autoplay check': isAutoplayEnabled,
            expectedState: isAutoplayEnabled ? 'will autoplay (muted)' : 'will be paused (unmuted)'
          });
          
          // Aplicar textura al plano frontal después de que el video esté listo
          this.video.addEventListener('loadedmetadata', () => {
            console.log('Video metadata cargada, aplicando textura...');
            // Aplicar textura usando el ID del video con propiedades mejoradas
            this.videoPlane.setAttribute('material', {
              shader: 'flat',
              src: '#' + this.videoId,
              transparent: false,
              alphaTest: 0,
              side: this.data.doubleSided ? 'double' : 'front',
              color: '#FFFFFF' // Asegurar color blanco para no oscurecer
            });
            console.log('🎨 Textura aplicada con ID:', '#' + this.videoId);
          });
          // Mostrar el primer frame y configurar estado inicial
          this.video.addEventListener('loadeddata', () => {
            console.log('Video loadeddata evento disparado');
            
            try {
              this.video.currentTime = 0;
              
              // Solo pausar si autoplay está desactivado (reutilizar variable anterior)
              if (!isAutoplayEnabled) {
                this.video.pause();
                console.log('🛑 Video pausado porque autoplay está DESACTIVADO:', this.data.autoplay);
              } else {
                console.log('▶️ Video listo para autoplay porque está ACTIVADO:', this.data.autoplay);
              }
              
              // Asegurar que la textura se actualice
              if (this.videoPlane.components.material) {
                this.videoPlane.components.material.material.map.needsUpdate = true;
                console.log('🎨 Textura del video actualizada en loadeddata');
              }
              
              console.log('Video loadeddata: currentTime', this.video.currentTime, 'paused', this.video.paused, 'autoplay', this.data.autoplay);
            } catch (error) {
              console.error('Error en loadeddata:', error);
            }
          });
          
          // Evento adicional para asegurar que el video se muestre
          this.video.addEventListener('canplay', () => {
            console.log('Video canplay - listo para reproducir');
            if (this.videoPlane.components.material) {
              this.videoPlane.components.material.material.map.needsUpdate = true;
              console.log('🎬 Textura actualizada en canplay');
            }
          });
          
          // Solo intentar reproducir automáticamente si autoplay es true (reutilizar variable anterior)
          if (isAutoplayEnabled) {
            console.log('Intentando autoplay...');
            this.attemptAutoplay();
          } else {
            console.log('Autoplay está desactivado, no se reproduce automáticamente');
          }
          
          // Configurar actualización periódica de la textura para asegurar que el video se muestre
          this.textureUpdateInterval = setInterval(() => {
            if (this.video && this.videoPlane && this.videoPlane.components.material) {
              this.videoPlane.components.material.material.map.needsUpdate = true;
            }
          }, 1000); // Actualizar cada segundo
        },
        
        createVideoElements: function() {
          const el = this.el;
          
          // Crear plano principal para el video
          this.videoPlane = document.createElement('a-plane');
          this.videoPlane.setAttribute('width', this.data.width);
          this.videoPlane.setAttribute('height', this.data.height);
          this.videoPlane.setAttribute('position', '0 0 0');
          this.videoPlane.setAttribute('material', {
            shader: 'flat',
            color: '#333333' // Color temporal hasta que se cargue el video
          });
          this.videoPlane.classList.add('clickable');
          this.videoPlane.id = 'video-plane-' + Math.floor(Math.random() * 10000);
          
          console.log('🎬 Plano de video creado:', {
            width: this.data.width,
            height: this.data.height,
            id: this.videoPlane.id
          });
          
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
          if (!this.video || !this.video.duration || isNaN(this.video.duration)) {
            console.warn('seekVideo: video no disponible o duración inválida');
            return;
          }
          
          try {
            const mousePos = event.detail.intersection.point;
            const progressWidth = this.data.width;
            const progressStart = -this.data.width/2;
            
            const clickPos = (mousePos.x - progressStart) / progressWidth;
            const seekTime = this.video.duration * Math.max(0, Math.min(1, clickPos));
            
            if (isFinite(seekTime) && !isNaN(seekTime)) {
              this.video.currentTime = seekTime;
              console.log("Seeking to", seekTime, "seconds");
            } else {
              console.warn('seekTime calculado es inválido:', seekTime);
            }
          } catch (error) {
            console.error("Error al buscar posición en el video:", error);
          }
        },
        
        togglePlay: function() {
          if (!this.video) {
            console.warn('togglePlay: video element no disponible');
            return;
          }
          
          try {
            console.log('togglePlay: estado actual - paused:', this.video.paused, 'muted:', this.video.muted);
            
            if (this.video.muted) {
              this.video.muted = false;
              console.log("Video unmuted");
            } else if (this.video.paused) {
              this.video.play()
                .then(() => {
                  console.log("Video reproduciendo exitosamente");
                  // Asegurar que la textura se actualice durante la reproducción
                  if (this.videoPlane.components.material) {
                    this.videoPlane.components.material.material.map.needsUpdate = true;
                  }
                })
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
          const isAutoplayEnabled = this.data.autoplay === true || this.data.autoplay === 'true';
          if (!isAutoplayEnabled) {
            console.log('Autoplay deshabilitado por configuración - Video permanece pausado:', this.data.autoplay);
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
          // Limpiar intervalo de actualización de textura
          if (this.textureUpdateInterval) {
            clearInterval(this.textureUpdateInterval);
            this.textureUpdateInterval = null;
          }
          
          if (this.video) {
            this.video.pause();
            this.video.src = '';
            this.video.load();
            
            // Remover el video del DOM
            if (this.video.parentNode) {
              this.video.parentNode.removeChild(this.video);
            }
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
          videoEntity: { type: 'string', default: '' }
        },

        init: function() {
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
