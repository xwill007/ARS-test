import React from 'react';

/**
 * VRVoiceController - Componente reutilizable para controles de voz
 * Puede ser usado en cualquier overlay que necesite reconocimiento de voz
 */
const VRVoiceController = ({ 
  position = [0, 0, 0],
  targetEntityId = '',
  targetComponent = '',
  enabled = true,
  language = 'es-ES',
  commands = {},
  showMicIcon = true,
  showVoiceText = true,
  showListeningIndicator = true,
  micIconSize = 1,
  textScale = 1,
  ...props 
}) => {

  // Generar controles de voz
  const generateVoiceControls = () => {
    return `
      <!-- Controles de voz -->
      <a-entity
        id="voice-controller"
        position="${position[0]} ${position[1]} ${position[2]}"
        vr-voice-control="
          enabled: ${enabled};
          targetEntityId: ${targetEntityId};
          targetComponent: ${targetComponent};
          language: ${language};
          commands: ${JSON.stringify(commands).replace(/"/g, '&quot;')}
        ">
        
        ${showMicIcon ? `
        <!-- Contenedor del icono de micrófono con gaze control -->
        <a-entity
          id="mic-container"
          position="0 0 0"
          vr-mic-gaze-control>
          
          <!-- Fondo del icono -->
          <a-plane
            id="mic-icon"
            width="${micIconSize}"
            height="${micIconSize}"
            position="0 0 0.01"
            material="color: #4CAF50; shader: flat; opacity: 0.9"
            geometry="primitive: plane"
            class="clickable raycastable"
            vr-mic-icon>
            
            <!-- Ring de progreso para gaze (inicialmente oculto) -->
            <a-ring
              id="gaze-progress-ring"
              radius-inner="${micIconSize * 0.6}"
              radius-outer="${micIconSize * 0.7}"
              theta-start="0"
              theta-length="0"
              position="0 0 0.01"
              material="color: #FFD700; shader: flat; opacity: 0.8"
              visible="false">
            </a-ring>
            
            <!-- Texto del micrófono -->
            <a-text
              id="mic-text"
              value="🎤"
              position="0 0 0.02"
              align="center"
              color="white"
              scale="${1.5 * textScale} ${1.5 * textScale} ${1.5 * textScale}">
            </a-text>
          </a-plane>
          
          <!-- Estado del micrófono -->
          <a-text
            id="mic-status"
            value="ON"
            position="0 ${-micIconSize * 0.8} 0.01"
            align="center"
            color="#4CAF50"
            scale="${0.6 * textScale} ${0.6 * textScale} ${0.6 * textScale}">
          </a-text>
          
        </a-entity>
        ` : ''}
        
        ${showVoiceText ? `
        <!-- Texto de reconocimiento de voz -->
        <a-text
          id="voice-text"
          value="Listo para comandos de voz"
          position="0 ${-1.5 * textScale} 0"
          align="center"
          color="white"
          scale="${textScale} ${textScale} ${textScale}"
          width="10">
        </a-text>
        ` : ''}
        
        ${showListeningIndicator ? `
        <!-- Indicador de escucha -->
        <a-text
          id="listening-indicator"
          value=""
          position="0 ${-2.5 * textScale} 0"
          align="center"
          color="#FF9800"
          scale="${1.2 * textScale} ${1.2 * textScale} ${1.2 * textScale}"
          width="8"
          visible="false">
        </a-text>
        ` : ''}
        
      </a-entity>
    `;
  };

  // Script para el sistema de control de voz
  const voiceControlScript = `
    <script>
      // Componente principal para controles de voz
      AFRAME.registerComponent('vr-voice-control', {
        schema: {
          enabled: { type: 'boolean', default: true },
          targetEntityId: { type: 'string', default: '' },
          targetComponent: { type: 'string', default: '' },
          language: { type: 'string', default: 'es-ES' },
          commands: { type: 'string', default: '{}' }
        },

        init: function() {
          console.log('🎤 Iniciando VRVoiceController');
          this.isListening = false;
          this.recognition = null;
          this.targetComponent = null;
          this.commandsConfig = {};
          
          // Parsear comandos
          try {
            this.commandsConfig = JSON.parse(this.data.commands);
          } catch (error) {
            console.warn('Error parsing commands config:', error);
            this.commandsConfig = this.getDefaultCommands();
          }
          
          // Si no hay comandos, usar defaults
          if (Object.keys(this.commandsConfig).length === 0) {
            this.commandsConfig = this.getDefaultCommands();
          }
          
          // Buscar el componente objetivo
          this.findTargetComponent();
          
          // Configurar reconocimiento de voz
          this.setupSpeechRecognition();
          
          // Iniciar escucha si está habilitado
          if (this.data.enabled) {
            this.startListening();
          }
          
          // Mostrar comandos disponibles
          this.showAvailableCommands();
        },

        getDefaultCommands: function() {
          return {
            'play': { 
              keywords: ['play', 'reproducir', 'reproduce', 'empezar', 'iniciar'],
              action: 'play',
              feedback: '▶️ Reproduciendo'
            },
            'pause': { 
              keywords: ['pause', 'pausar', 'pausa', 'detener'],
              action: 'pause',
              feedback: '⏸️ Pausado'
            },
            'stop': { 
              keywords: ['stop', 'parar', 'detener', 'terminar'],
              action: 'stop',
              feedback: '⏹️ Detenido'
            },
            'mute': { 
              keywords: ['mute', 'silenciar', 'sin sonido', 'mudo'],
              action: 'mute',
              feedback: '🔇 Silenciado'
            },
            'unmute': { 
              keywords: ['unmute', 'activar sonido', 'sonido', 'audio'],
              action: 'unmute',
              feedback: '🔊 Audio activado'
            }
          };
        },

        findTargetComponent: function() {
          if (!this.data.targetEntityId || !this.data.targetComponent) {
            console.warn('🎤 No se especificó entidad o componente objetivo');
            return;
          }
          
          const targetEntity = document.querySelector('#' + this.data.targetEntityId);
          if (targetEntity) {
            this.targetComponent = targetEntity.components[this.data.targetComponent];
            if (this.targetComponent) {
              console.log('🎤 Componente objetivo encontrado:', this.data.targetComponent);
            } else {
              console.warn('🎤 Componente no encontrado:', this.data.targetComponent);
            }
          } else {
            console.warn('🎤 Entidad objetivo no encontrada:', this.data.targetEntityId);
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
          this.recognition.lang = this.data.language;
          
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
          
          // Buscar comando que coincida
          for (const [commandName, commandConfig] of Object.entries(this.commandsConfig)) {
            for (const keyword of commandConfig.keywords) {
              if (command.includes(keyword.toLowerCase())) {
                console.log('🎤 Comando detectado:', commandName);
                this.updateVoiceText(commandConfig.feedback);
                this.executeCommand(commandConfig.action, commandName);
                return;
              }
            }
          }
          
          // No se encontró comando
          this.updateVoiceText('❓ Comando no reconocido: "' + command + '"');
        },

        executeCommand: function(action, commandName) {
          if (!this.targetComponent) {
            console.warn('🎤 No hay componente objetivo para ejecutar comando');
            return;
          }

          // Ejecutar acción en el componente objetivo
          switch (action) {
            case 'play':
              if (this.targetComponent.video && this.targetComponent.video.paused) {
                this.targetComponent.togglePlay();
              }
              break;
            case 'pause':
              if (this.targetComponent.video && !this.targetComponent.video.paused) {
                this.targetComponent.togglePlay();
              }
              break;
            case 'stop':
              if (this.targetComponent.video) {
                this.targetComponent.video.pause();
                this.targetComponent.video.currentTime = 0;
              }
              break;
            case 'mute':
              if (this.targetComponent.video) {
                this.targetComponent.video.muted = true;
              }
              break;
            case 'unmute':
              if (this.targetComponent.video) {
                this.targetComponent.video.muted = false;
              }
              break;
            default:
              // Comando personalizado - llamar método si existe
              if (typeof this.targetComponent[action] === 'function') {
                this.targetComponent[action]();
              } else {
                console.warn('🎤 Acción no implementada:', action);
              }
          }
        },

        showAvailableCommands: function() {
          const commands = Object.values(this.commandsConfig)
            .map(cmd => cmd.keywords[0])
            .join(', ');
          this.updateVoiceText('🎤 Comandos: ' + commands);
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
          const micTextEl = document.querySelector('#mic-text');
          if (micIconEl && micTextEl) {
            if (this.data.enabled) {
              micIconEl.setAttribute('material', 'color', '#4CAF50');
              micTextEl.setAttribute('value', '🎤');
            } else {
              micIconEl.setAttribute('material', 'color', '#F44336');
              micTextEl.setAttribute('value', '🔇');
            }
          }
        },

        remove: function() {
          if (this.recognition) {
            this.recognition.stop();
            this.recognition = null;
          }
          console.log('🎤 VRVoiceController removido');
        }
      });          
          // Registrar componente para control de micrófono con gaze
          AFRAME.registerComponent('vr-mic-gaze-control', {
            init: function() {
              this.gazeStartTime = null;
              this.gazeTimeout = 3000; // 3 segundos
              this.progressRing = null;
              this.gazeInterval = null;
              this.isGazing = false;
              
              // Referencias a elementos
              setTimeout(() => {
                this.progressRing = this.el.querySelector('#gaze-progress-ring');
                console.log('🎯 Ring de progreso encontrado:', !!this.progressRing);
              }, 100);
              
              // Eventos de raycaster usando A-Frame
              this.el.addEventListener('raycaster-intersected', (evt) => {
                console.log('👁️ Raycaster intersectado en micrófono');
                this.startGaze();
              });
              
              this.el.addEventListener('raycaster-intersected-cleared', (evt) => {
                console.log('👁️ Raycaster ya no intersecta el micrófono');
                this.stopGaze();
              });
            },
            
            startGaze: function() {
              if (this.isGazing) return; // Ya está en progreso
              
              console.log('🎯 Iniciando gaze en micrófono');
              this.isGazing = true;
              this.gazeStartTime = Date.now();
              
              // Mostrar ring de progreso
              if (this.progressRing) {
                this.progressRing.setAttribute('visible', true);
                this.progressRing.setAttribute('theta-length', 0);
                this.progressRing.setAttribute('material', 'color', '#FFD700');
              }
              
              // Animación de progreso
              this.gazeInterval = setInterval(() => {
                const elapsed = Date.now() - this.gazeStartTime;
                const progress = Math.min(elapsed / this.gazeTimeout, 1);
                const thetaLength = progress * 360;
                
                if (this.progressRing) {
                  this.progressRing.setAttribute('theta-length', thetaLength);
                }
                
                // Completado
                if (progress >= 1) {
                  this.completeGaze();
                }
              }, 50);
            },
            
            stopGaze: function() {
              if (!this.isGazing) return;
              
              console.log('🎯 Deteniendo gaze en micrófono');
              this.isGazing = false;
              this.gazeStartTime = null;
              
              // Ocultar ring de progreso
              if (this.progressRing) {
                this.progressRing.setAttribute('visible', false);
                this.progressRing.setAttribute('theta-length', 0);
              }
              
              // Limpiar intervalo
              if (this.gazeInterval) {
                clearInterval(this.gazeInterval);
                this.gazeInterval = null;
              }
            },
            
            completeGaze: function() {
              console.log('🎯 ¡Gaze completado! Activando micrófono');
              this.stopGaze();
              
              // Toggle del micrófono
              const micIcon = this.el.querySelector('#mic-icon');
              if (micIcon && micIcon.components && micIcon.components['vr-mic-icon']) {
                micIcon.components['vr-mic-icon'].toggleMicrophone();
              }
              
              // Efecto de pulso visual
              if (this.progressRing) {
                this.progressRing.setAttribute('visible', true);
                this.progressRing.setAttribute('theta-length', 360);
                this.progressRing.setAttribute('material', 'color', '#4CAF50');
                this.progressRing.setAttribute('animation', {
                  property: 'scale',
                  to: '1.3 1.3 1.3',
                  dur: 300,
                  direction: 'alternate',
                  loop: 2
                });
                
                // Ocultar después del efecto
                setTimeout(() => {
                  this.progressRing.setAttribute('visible', false);
                }, 800);
              }
            }
          });
          
          // Componente para el icono del micrófono
          AFRAME.registerComponent('vr-mic-icon', {
            init: function() {
              this.micText = null;
              this.micStatus = null;
              
              // Obtener referencias después de que el DOM esté listo
              setTimeout(() => {
                this.micText = this.el.querySelector('#mic-text');
                this.micStatus = this.el.querySelector('#mic-status');
              }, 100);
              
              // Manejar click
              this.el.addEventListener('click', () => {
                this.toggleMicrophone();
              });
              
              // Estado inicial
              setTimeout(() => {
                this.updateVisualState();
              }, 200);
            },
            
            toggleMicrophone: function() {
              const voiceControlEl = document.querySelector('[vr-voice-control]');
              if (voiceControlEl && voiceControlEl.components['vr-voice-control']) {
                voiceControlEl.components['vr-voice-control'].toggleListening();
                
                // Actualizar estado visual después de un breve delay
                setTimeout(() => {
                  this.updateVisualState();
                }, 100);
              }
            },
            
            updateVisualState: function() {
              const voiceControlEl = document.querySelector('[vr-voice-control]');
              const isListening = voiceControlEl?.components?.['vr-voice-control']?.data?.enabled || false;
              
              // Actualizar color del fondo
              this.el.setAttribute('material', {
                color: isListening ? '#4CAF50' : '#757575'
              });
              
              // Actualizar texto del estado
              if (this.micStatus) {
                this.micStatus.setAttribute('value', isListening ? 'ON' : 'OFF');
                this.micStatus.setAttribute('color', isListening ? '#4CAF50' : '#757575');
              }
              
              // Actualizar emoji del micrófono
              if (this.micText) {
                this.micText.setAttribute('value', isListening ? '🎤' : '🔇');
              }
              
              // Animación de pulso cuando está activo
              if (isListening) {
                this.el.setAttribute('animation', {
                  property: 'scale',
                  to: '1.1 1.1 1.1',
                  dur: 1000,
                  direction: 'alternate',
                  loop: true
                });
              } else {
                this.el.removeAttribute('animation');
                this.el.setAttribute('scale', '1 1 1');
              }
            }
          });

      console.log('🎤 VRVoiceController registrado correctamente');
    </script>
  `;

  const srcDoc = `
    <html>
      <head>
        <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
        ${voiceControlScript}
      </head>
      <body style="margin:0; background:transparent;">
        <a-scene embedded vr-mode-ui="enabled: false" style="width: 100vw; height: 100vh; background: transparent;">
          ${generateVoiceControls()}
          <a-camera position="0 1.8 0" rotation="0 0 0">
            <!-- Cursor para interacción por mirada -->
            <a-entity 
              id="vr-voice-cursor"
              cursor="rayOrigin: mouse; fuse: false"
              raycaster="objects: .raycastable; far: 10; showLine: true; lineColor: #4CAF50; lineOpacity: 0.5"
              position="0 0 -1"
              geometry="primitive: ring; radiusInner: 0.005; radiusOuter: 0.01"
              material="color: white; shader: flat; opacity: 0.8">
            </a-entity>
          </a-camera>
        </a-scene>
      </body>
    </html>
  `;

  return (
    <iframe
      title="VR Voice Controller"
      srcDoc={srcDoc}
      style={{ 
        width: '100%', 
        height: '100%', 
        border: 'none', 
        background: 'transparent', 
        pointerEvents: 'auto' 
      }}
      allow="microphone"
    />
  );
};

export default VRVoiceController;
