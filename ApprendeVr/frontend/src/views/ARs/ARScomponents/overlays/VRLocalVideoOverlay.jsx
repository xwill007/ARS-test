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
 * 
 * NUEVO: Manejo de audio para evitar eco en modo estereoscópico
 * - Panel izquierdo (primario): Audio a 1% de volumen para minimizar eco pero mantener sincronización
 * - Panel derecho: Audio a volumen completo (100%)
 * - Se pasan props isPrimaryPanel e isRightPanel para controlar el comportamiento
 * 
 * NUEVO: Sistema de sincronización entre paneles
 * - Sincronización perfecta de play/pause/seek entre ambos paneles
 * - Control de tiempo basado en timestamps para precisión máxima
 * - Comandos de voz sincronizan automáticamente ambos paneles
 * 
 * CONTROLES:
 * - Clic simple: Play/Pause sincronizado del video
 * - Doble clic: Control de volumen (silenciar/restaurar)
 * - Comandos de voz: 'play', 'pause', 'stop', 'adelante', 'atrás', 'inicio'
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
  voiceCommandsActivated = false, // Siempre false por defecto
  showCursor = true, // Nueva prop para controlar si se muestra el cursor
  isPrimaryPanel = true, // Nueva prop para determinar si es el panel principal
  isRightPanel = false, // Nueva prop para determinar si es el panel derecho
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
          
          <!-- Indicador de estado (tamaño grande) -->
          <a-text
            id="mic-status"
            value="OFF"
            position="0 -0.5 0.03"
            align="center"
            color="#FFB3B3"
            scale="0.7 0.7 0.7">
          </a-text>
          
        </a-entity>
        
        <!-- Texto de reconocimiento de voz -->
        <a-text
          id="voice-text"
          value="🎤 Comandos: 'play', 'pause', 'stop', 'adelante', 'atrás', 'inicio'"
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
            invertBackSide: ${invertBackSide};
            isPrimaryPanel: ${isPrimaryPanel};
            isRightPanel: ${isRightPanel}
          ">
        </a-entity>
        
      </a-entity>
    `;
  };

  // Script para cargar el componente vr-local-video
  const videoScript = `
    <script>
      // Sistema de sincronización global para paneles estéreo
      window.VRVideoSync = window.VRVideoSync || {
        instances: [],
        playStartTime: null,
        pauseTime: 0,
        isPlaying: false,
        lastSavedTime: 0,
        videoSrc: null,
        
        // Cargar tiempo guardado del video principal
        loadSavedTime: function(src) {
          try {
            const key = 'vr-video-time-' + btoa(src).slice(0, 20);
            const saved = localStorage.getItem(key);
            if (saved) {
              const data = JSON.parse(saved);
              this.pauseTime = data.currentTime || 0;
              this.isPlaying = data.isPlaying || false;
              this.videoSrc = src;
              console.log('⏱️ Tiempo cargado desde localStorage:', this.pauseTime, 'segundos, src:', src);
              return this.pauseTime;
            }
          } catch (error) {
            console.warn('Error cargando tiempo guardado:', error);
          }
          return 0;
        },
        
        // Guardar tiempo actual en localStorage
        saveCurrentTime: function(src, currentTime, isPlaying) {
          try {
            const key = 'vr-video-time-' + btoa(src).slice(0, 20);
            const data = {
              currentTime: currentTime,
              isPlaying: isPlaying,
              timestamp: Date.now(),
              src: src
            };
            localStorage.setItem(key, JSON.stringify(data));
            this.lastSavedTime = currentTime;
            console.log('💾 Tiempo guardado en localStorage:', currentTime, 'segundos');
          } catch (error) {
            console.warn('Error guardando tiempo:', error);
          }
        },
        
        // Auto-guardado periódico del tiempo
        startAutoSave: function(src) {
          if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
          }
          
          this.autoSaveInterval = setInterval(() => {
            if (this.instances.length > 0) {
              const currentTime = this.getCurrentTime();
              this.saveCurrentTime(src, currentTime, this.isPlaying);
            }
          }, 2000); // Guardar cada 2 segundos
        },
        
        register: function(instance) {
          this.instances.push(instance);
          console.log('📽️ Registrando instancia de video, total:', this.instances.length);
          
          // Cargar tiempo guardado cuando se registra la primera instancia
          if (this.instances.length === 1 && instance.data.src) {
            const savedTime = this.loadSavedTime(instance.data.src);
            if (savedTime > 0) {
              this.pauseTime = savedTime;
              console.log('🔄 Restaurando tiempo a:', savedTime, 'segundos');
              
              // Aplicar el tiempo guardado a la instancia
              setTimeout(() => {
                if (instance.video) {
                  instance.video.currentTime = savedTime;
                  console.log('⏰ Tiempo aplicado a video:', savedTime);
                }
              }, 500);
            }
            
            // Iniciar auto-guardado
            this.startAutoSave(instance.data.src);
          }
        },
        
        unregister: function(instance) {
          this.instances = this.instances.filter(i => i !== instance);
          console.log('📽️ Desregistrando instancia de video, total:', this.instances.length);
          
          // Guardar tiempo final al desregistrar la última instancia
          if (this.instances.length === 0) {
            if (instance.data.src) {
              const currentTime = this.getCurrentTime();
              this.saveCurrentTime(instance.data.src, currentTime, this.isPlaying);
              console.log('💾 Guardado final al cerrar ARS:', currentTime, 'segundos');
            }
            
            // Detener auto-guardado
            if (this.autoSaveInterval) {
              clearInterval(this.autoSaveInterval);
              this.autoSaveInterval = null;
            }
          }
        },
        
        syncPlay: function(initiator) {
          const now = Date.now();
          this.playStartTime = now - (this.pauseTime * 1000);
          this.isPlaying = true;
          
          console.log('🎬 Sincronizando PLAY desde panel:', initiator.data.isRightPanel ? 'derecho' : 'izquierdo');
          console.log('⏰ Timestamp de inicio:', this.playStartTime, 'Tiempo pausado:', this.pauseTime);
          
          this.instances.forEach(instance => {
            if (instance !== initiator && instance.video) {
              try {
                instance.video.currentTime = this.pauseTime;
                instance.video.play().catch(err => 
                  console.warn('Error sincronizando play:', err)
                );
              } catch (error) {
                console.error('Error en sync play:', error);
              }
            }
          });
        },
        
        syncPause: function(initiator) {
          const now = Date.now();
          if (this.playStartTime) {
            this.pauseTime = (now - this.playStartTime) / 1000;
          }
          this.isPlaying = false;
          
          console.log('⏸️ Sincronizando PAUSE desde panel:', initiator.data.isRightPanel ? 'derecho' : 'izquierdo');
          console.log('⏰ Tiempo de pausa:', this.pauseTime, 'segundos');
          
          this.instances.forEach(instance => {
            if (instance !== initiator && instance.video) {
              try {
                instance.video.pause();
                instance.video.currentTime = this.pauseTime;
              } catch (error) {
                console.error('Error en sync pause:', error);
              }
            }
          });
        },
        
        syncSeek: function(initiator, seekTime) {
          const now = Date.now();
          this.pauseTime = seekTime;
          
          if (this.isPlaying) {
            this.playStartTime = now - (seekTime * 1000);
          }
          
          console.log('⏩ Sincronizando SEEK desde panel:', initiator.data.isRightPanel ? 'derecho' : 'izquierdo');
          console.log('⏰ Nuevo tiempo:', seekTime, 'segundos');
          
          this.instances.forEach(instance => {
            if (instance !== initiator && instance.video) {
              try {
                instance.video.currentTime = seekTime;
              } catch (error) {
                console.error('Error en sync seek:', error);
              }
            }
          });
        },
        
        getCurrentTime: function() {
          if (!this.isPlaying) {
            return this.pauseTime;
          }
          const now = Date.now();
          return (now - this.playStartTime) / 1000;
        }
      };

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
          isPrimaryPanel: { type: 'boolean', default: true },
          isRightPanel: { type: 'boolean', default: false }
        },

        init: function() {
          console.log('Iniciando componente vr-local-video', this.data);
          
          // Registrar esta instancia en el sistema de sincronización
          window.VRVideoSync.register(this);
          
          // Crear estructura de elementos
          this.createVideoElements();
          // Crear elemento de video principal
          this.video = document.createElement('video');
          this.video.crossOrigin = 'anonymous';
          this.video.loop = true;
          this.video.playsInline = true;
          this.video.setAttribute('playsinline', '');
          this.video.setAttribute('webkit-playsinline', '');

          // Variables para manejo de doble clic
          this.lastClickTime = 0;
          this.clickTimeout = null;

          // Configurar audio según el panel para evitar eco
          // Panel izquierdo (primario) = volumen muy bajo (5%) para evitar eco pero mantener sincronización
          // Panel derecho = volumen normal (100%)
          if (this.data.isPrimaryPanel && !this.data.isRightPanel) {
            this.video.muted = false;
            this.video.volume = 0.01; // 1% del volumen para minimizar eco pero permitir reproducción
            console.log('� Panel izquierdo: Audio a 1% de volumen para evitar eco');
          } else if (this.data.isRightPanel) {
            this.video.muted = false;
            this.video.volume = 1.0; // 100% del volumen
            console.log('🔊 Panel derecho: Audio a volumen completo');
          } else {
            // Fallback para casos no especificados
            this.video.muted = false;
            this.video.volume = 0.05; // Volumen bajo por defecto
            console.log('� Panel no identificado: Audio a volumen bajo por defecto');
          }

          // Configurar listeners
          this.video.addEventListener('timeupdate', this.updateProgress.bind(this));
          this.videoPlane.addEventListener('click', this.handleClick.bind(this));
          this.progressBarBg.addEventListener('click', this.seekVideo.bind(this));
          if (this.backVideoPlane) {
            this.backVideoPlane.addEventListener('click', this.handleClick.bind(this));
          }
          // Cargar el video
          this.video.src = this.data.src;
          this.video.load();
          console.log('Video src asignado:', this.video.src, 'autoplay:', this.data.autoplay, 'muted:', this.video.muted);
          // Aplicar textura al plano frontal
          this.videoPlane.setAttribute('material', {
            shader: 'flat',
            src: this.video,
            side: this.data.doubleSided ? 'double' : 'front'
          });
          // Mostrar el primer frame y aplicar tiempo guardado
          this.video.addEventListener('loadeddata', () => {
            console.log('Video loadeddata event - aplicando tiempo sincronizado');
            
            // Obtener tiempo guardado del sistema de sincronización
            const savedTime = window.VRVideoSync.getCurrentTime();
            this.video.currentTime = savedTime;
            this.video.pause();
            
            if (this.videoPlane.components.material) {
              this.videoPlane.components.material.material.map.needsUpdate = true;
            }
            
            console.log('⏰ Video inicializado en tiempo:', savedTime, 'segundos (desde localStorage)');
            
            // Si había reproducción en curso, continuar
            if (window.VRVideoSync.isPlaying && this.data.autoplay) {
              setTimeout(() => {
                console.log('▶️ Continuando reproducción desde tiempo guardado');
                window.VRVideoSync.syncPlay(this);
                this.video.play().catch(err => 
                  console.warn('Error al continuar reproducción:', err)
                );
              }, 100);
            }
          });
          // Solo intentar reproducir automáticamente si autoplay es true Y no hay tiempo guardado
          if (this.data.autoplay && window.VRVideoSync.pauseTime === 0) {
            console.log('Intentando autoplay desde el inicio...');
            this.attemptAutoplay();
          } else if (window.VRVideoSync.pauseTime > 0) {
            console.log('Autoplay omitido - restaurando desde tiempo guardado:', window.VRVideoSync.pauseTime);
          } else {
            console.log('Autoplay está desactivado, no se reproduce automáticamente');
          }
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
          
          // Usar tiempo sincronizado en lugar del tiempo real del video
          const currentTime = window.VRVideoSync.getCurrentTime();
          const progress = currentTime / this.video.duration;
          
          if (isNaN(progress)) return;
          
          const barWidth = this.data.width * progress;
          const position = -this.data.width/2 + (barWidth / 2);
          
          this.progressBar.setAttribute('width', barWidth);
          this.progressBar.setAttribute('position', position + ' 0 0.01');
          
          const timeText = this.formatTime(currentTime) + ' / ' + this.formatTime(this.video.duration);
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
              // Usar sistema de sincronización para buscar posición
              window.VRVideoSync.syncSeek(this, seekTime);
              
              this.video.currentTime = seekTime;
              console.log("🎯 Seeking sincronizado a", seekTime, "seconds");
            }
          } catch (error) {
            console.error("Error al buscar posición en el video:", error);
          }
        },
        
        // Función para manejar clic simple y doble clic
        handleClick: function(event) {
          const currentTime = Date.now();
          const timeDiff = currentTime - this.lastClickTime;
          
          // Si es un doble clic (menos de 300ms desde el último clic)
          if (timeDiff < 300) {
            // Cancelar el timeout del clic simple
            if (this.clickTimeout) {
              clearTimeout(this.clickTimeout);
              this.clickTimeout = null;
            }
            // Ejecutar acción de doble clic (controlar volumen)
            this.toggleVolume();
            console.log('🖱️ Doble clic detectado - Controlando volumen');
          } else {
            // Es un clic simple, programar la acción con delay
            this.clickTimeout = setTimeout(() => {
              this.togglePlay();
              console.log('🖱️ Clic simple - Controlando reproducción');
              this.clickTimeout = null;
            }, 300); // Esperar 300ms para ver si hay un segundo clic
          }
          
          this.lastClickTime = currentTime;
        },
        
        togglePlay: function() {
          if (!this.video) return;
          
          try {
            if (this.video.paused) {
              // Usar sistema de sincronización para reproducir
              window.VRVideoSync.syncPlay(this);
              
              this.video.play()
                .then(() => {
                  const panelInfo = this.data.isRightPanel ? '(Panel derecho)' : '(Panel izquierdo)';
                  const volumeInfo = this.data.isRightPanel ? 'volumen 100%' : 'volumen 1%';
                  console.log('▶️ Video reproduciendo ' + panelInfo + ' - ' + volumeInfo);
                })
                .catch(err => console.error("Error al reproducir:", err));
            } else {
              // Usar sistema de sincronización para pausar
              window.VRVideoSync.syncPause(this);
              
              this.video.pause();
              const panelInfo = this.data.isRightPanel ? '(Panel derecho)' : '(Panel izquierdo)';
              console.log("⏸️ Video pausado " + panelInfo);
            }
          } catch (error) {
            console.error("Error al controlar la reproducción:", error);
          }
        },
        
        attemptAutoplay: function() {
          if (!this.data.autoplay) {
            console.log('Autoplay deshabilitado por configuración');
            return;
          }
          console.log('Llamando video.play() para autoplay...');
          const playPromise = this.video.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('Autoplay funcionando', 'paused:', this.video.paused);
                setTimeout(() => {
                  if (this.video && !this.video.paused) {
                    // Los volúmenes ya están configurados en init()
                    // Panel izquierdo: 5%, Panel derecho: 100%
                    if (this.data.isRightPanel) {
                      console.log('🔊 Panel derecho reproduciendo con volumen completo');
                    } else {
                      console.log('� Panel izquierdo reproduciendo con volumen bajo para evitar eco');
                    }
                  }
                }, 2000);
              })
              .catch(error => {
                console.warn('Error en autoplay:', error);
              });
          } else {
            console.warn('video.play() no devolvió promesa');
          }
        },
        
        // Nueva función para alternar volumen entre bajo y normal
        toggleVolume: function() {
          if (!this.video) return;
          
          try {
            if (this.data.isRightPanel) {
              // Panel derecho: alternar entre volumen completo y silencio
              if (this.video.volume > 0.5) {
                this.video.volume = 0;
                console.log('🔇 Panel derecho: Volumen silenciado');
              } else {
                this.video.volume = 1.0;
                console.log('🔊 Panel derecho: Volumen completo');
              }
            } else {
              // Panel izquierdo: alternar entre volumen bajo y silencio
              if (this.video.volume > 0.02) {
                this.video.volume = 0;
                console.log('🔇 Panel izquierdo: Volumen silenciado');
              } else {
                this.video.volume = 0.05;
                console.log('🔉 Panel izquierdo: Volumen bajo');
              }
            }
          } catch (error) {
            console.error("Error al controlar el volumen:", error);
          }
        },

        remove: function() {
          // Guardar tiempo actual antes de desregistrar
          if (this.video && this.data.src) {
            const currentTime = window.VRVideoSync.getCurrentTime();
            window.VRVideoSync.saveCurrentTime(this.data.src, currentTime, window.VRVideoSync.isPlaying);
            console.log('💾 Tiempo guardado al remover componente:', currentTime, 'segundos');
          }
          
          // Desregistrar del sistema de sincronización
          window.VRVideoSync.unregister(this);
          
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
            micStatus.setAttribute('scale', '0.7 0.7 0.7');
            
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
              // Usar sincronización para parar y volver al inicio
              window.VRVideoSync.syncSeek(this.videoComponent, 0);
              window.VRVideoSync.syncPause(this.videoComponent);
              this.videoComponent.video.pause();
              this.videoComponent.video.currentTime = 0;
            }
          }
          // Comando de silenciar
          else if (command.includes('mute') || command.includes('silenciar') || command.includes('sin sonido')) {
            console.log('🎤 Comando: Mute');
            this.updateVoiceText('🔇 Audio silenciado');
            if (this.videoComponent.video) {
              this.videoComponent.video.volume = 0;
            }
          }
          // Comando de activar sonido
          else if (command.includes('unmute') || command.includes('activar sonido') || command.includes('sonido')) {
            console.log('🎤 Comando: Unmute');
            this.updateVoiceText('🔊 Audio activado');
            if (this.videoComponent.video) {
              // Restaurar volumen según el panel
              if (this.videoComponent.data.isRightPanel) {
                this.videoComponent.video.volume = 1.0;
              } else {
                this.videoComponent.video.volume = 0.05;
              }
            }
          }
          // Comando de adelantar 10 segundos
          else if (command.includes('adelante') || command.includes('avanza') || command.includes('adelantar')) {
            console.log('🎤 Comando: Adelantar');
            this.updateVoiceText('⏩ Adelantando 10 segundos');
            if (this.videoComponent.video) {
              const currentTime = window.VRVideoSync.getCurrentTime();
              const newTime = Math.min(currentTime + 10, this.videoComponent.video.duration);
              window.VRVideoSync.syncSeek(this.videoComponent, newTime);
              this.videoComponent.video.currentTime = newTime;
            }
          }
          // Comando de atrasar 10 segundos
          else if (command.includes('atrás') || command.includes('retrocede') || command.includes('atrasar')) {
            console.log('🎤 Comando: Atrasar');
            this.updateVoiceText('⏪ Atrasando 10 segundos');
            if (this.videoComponent.video) {
              const currentTime = window.VRVideoSync.getCurrentTime();
              const newTime = Math.max(currentTime - 10, 0);
              window.VRVideoSync.syncSeek(this.videoComponent, newTime);
              this.videoComponent.video.currentTime = newTime;
            }
          }
          // Comando de ir al inicio
          else if (command.includes('inicio') || command.includes('reinicia') || command.includes('restart')) {
            console.log('🎤 Comando: Ir al inicio');
            this.updateVoiceText('⏮️ Volviendo al inicio');
            if (this.videoComponent.video) {
              window.VRVideoSync.syncSeek(this.videoComponent, 0);
              this.videoComponent.video.currentTime = 0;
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
