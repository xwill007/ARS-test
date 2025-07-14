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
 * - Panel izquierdo (primario): Audio a 5% de volumen para minimizar eco pero mantener sincronización
 * - Panel derecho: Audio a volumen completo (100%)
 * - Se pasan props isPrimaryPanel e isRightPanel para controlar el comportamiento
 * 
 * CONTROLES:
 * - Clic simple: Play/Pause del video
 * - Doble clic: Control de volumen (silenciar/restaurar)
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

  // Generar controles de progreso de tiempo
  const generateProgressControls = () => {
    return `
      <!-- Controles de progreso - Barra pegada exactamente al borde inferior del video -->
      <a-entity
        id="progress-controls"
        position="${position[0]} ${position[1] - height/2 - 0.1} ${position[2]}"
        class="progress-controls">
        
        <!-- Contenedor principal de la barra de progreso -->
        <a-entity id="progress-bar-container">
          
          <!-- Barra de fondo del progreso (grosor reducido a la mitad) -->
          <a-plane
            id="progress-bar-bg"
            width="${width}"
            height="0.2"
            material="color: #222222; shader: flat; opacity: 0.9"
            class="clickable raycastable"
            progress-control="action: seek">
          </a-plane>
          
          <!-- Barra de progreso activa -->
          <a-plane
            id="progress-bar"
            width="0"
            height="0.15"
            position="${-width/2} 0 0.01"
            material="color: #1565C0; shader: flat">
          </a-plane>
          
          <!-- Tiempo actual en el lado izquierdo -->
          <a-text
            id="current-time"
            value="0:00"
            position="${-width/2 + 0.5} 0 0.02"
            align="left"
            color="white"
            scale="0.7 0.7 0.7">
          </a-text>
          
          <!-- Tiempo total en el lado derecho -->
          <a-text
            id="total-time"
            value="0:00"
            position="${width/2 - 0.5} 0 0.02"
            align="right"
            color="white"
            scale="0.7 0.7 0.7">
          </a-text>
          
          <!-- Indicador de progreso en porcentaje (centro) -->
          <a-text
            id="progress-display"
            value="0%"
            position="0 0 0.02"
            align="center"
            color="#000000"
            scale="0.6 0.6 0.6">
          </a-text>
          
          <!-- Líneas de referencia para cuartos del video -->
          <a-plane
            width="0.02"
            height="0.125"
            position="${-width/4} 0 0.015"
            material="color: #444444; shader: flat; opacity: 0.6">
          </a-plane>
          
          <a-plane
            width="0.02"
            height="0.125"
            position="${width/4} 0 0.015"
            material="color: #444444; shader: flat; opacity: 0.6">
          </a-plane>
          
        </a-entity>
        
      </a-entity>
    `;
  };

  // Generar controles de volumen
  const generateVolumeControls = () => {
    return `
      <!-- Controles de volumen - Barra pegada exactamente al borde derecho del video -->
      <a-entity
        id="volume-controls"
        position="${position[0] + width/2 + 0.125} ${position[1]} ${position[2]}"
        class="volume-controls">
        
        <!-- Contenedor principal de la barra -->
        <a-entity id="volume-bar-container">
          
          <!-- Barra de fondo extendida (grosor reducido a la mitad) -->
          <a-plane
            id="volume-bar-bg"
            width="0.25"
            height="${height}"
            material="color: #222222; shader: flat; opacity: 0.9"
            class="clickable raycastable"
            volume-control="action: seek">
          </a-plane>
          
          <!-- Barra de volumen activa -->
          <a-plane
            id="volume-bar"
            width="0.2"
            height="${height}"
            position="0 0 0.01"
            material="color: #000000; shader: flat">
          </a-plane>
          
          <!-- Botón + integrado en la parte superior -->
          <a-text
            id="volume-up-btn"
            value="+"
            position="0 ${height/2 - 0.3} 0.02"
            align="center"
            color="white"
            scale="1.2 1.2 1.2"
            class="clickable raycastable"
            volume-control="action: up">
          </a-text>
          
          <!-- Indicador de porcentaje en el centro -->
          <a-text
            id="volume-display"
            value="100%"
            position="0 0 0.02"
            align="center"
            color="white"
            scale="0.6 0.6 0.6">
          </a-text>
          
          <!-- Botón - integrado en la parte inferior -->
          <a-text
            id="volume-down-btn"
            value="−"
            position="0 ${-height/2 + 0.3} 0.02"
            align="center"
            color="white"
            scale="1.2 1.2 1.2"
            class="clickable raycastable"
            volume-control="action: down">
          </a-text>
          
          <!-- Líneas de referencia opcionales -->
          <a-plane
            width="0.15"
            height="0.02"
            position="0 ${height/4} 0.015"
            material="color: #444444; shader: flat; opacity: 0.6">
          </a-plane>
          
          <a-plane
            width="0.15"
            height="0.02"
            position="0 ${-height/4} 0.015"
            material="color: #444444; shader: flat; opacity: 0.6">
          </a-plane>
          
        </a-entity>
        
      </a-entity>
    `;
  };

  // Generar botón para ocultar/mostrar controles
  const generateToggleButton = () => {
    return `
      <!-- Botón para ocultar/mostrar controles - Esquina inferior derecha -->
      <a-entity
        id="toggle-controls-button"
        position="${position[0] + width/2 + 0.125} ${position[1] - height/2 - 0.1} ${position[2] + 0.01}"
        class="toggle-button">
        
        <!-- Fondo del botón cuadrado -->
        <a-plane
          id="toggle-button-bg"
          width="0.25"
          height="0.2"
          material="color: #333333; shader: flat; opacity: 0.9"
          class="clickable raycastable"
          toggle-controls="action: toggle">
        </a-plane>
        
        <!-- Texto X en el centro del botón -->
        <a-text
          id="toggle-button-text"
          value="X"
          position="0 0 0.02"
          align="center"
          color="white"
          font="roboto"
          scale="0.6 0.6 0.6"
          class="clickable raycastable"
          toggle-controls="action: toggle">
        </a-text>
        
      </a-entity>
    `;
  };
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
          value="🎤 Comandos: 'play', 'pause', 'subir volumen', 'bajar volumen'"
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
          color="#000000"
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
          this.video.addEventListener('volumechange', this.updateVolumeDisplay.bind(this));
          this.videoPlane.addEventListener('click', this.handleClick.bind(this));
          
          // Configurar listener para la barra de progreso
          setTimeout(() => {
            const progressBarBg = document.querySelector('#progress-bar-bg');
            if (progressBarBg) {
              progressBarBg.addEventListener('click', this.seekVideo.bind(this));
            }
          }, 100);
          
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
          // Mostrar el primer frame aunque autoplay sea false
          this.video.addEventListener('loadeddata', () => {
            this.video.currentTime = 0;
            this.video.pause();
            if (this.videoPlane.components.material) {
              this.videoPlane.components.material.material.map.needsUpdate = true;
            }
            console.log('Video loadeddata: currentTime', this.video.currentTime, 'paused', this.video.paused);
          });
          // Solo intentar reproducir automáticamente si autoplay es true
          if (this.data.autoplay) {
            console.log('Intentando autoplay...');
            this.attemptAutoplay();
          } else {
            console.log('Autoplay está desactivado, no se reproduce automáticamente');
          }
          
          // Actualizar display de volumen inicial
          setTimeout(() => {
            this.updateVolumeDisplay();
          }, 100);
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
          
          el.appendChild(this.videoPlane);
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
          
          // Actualizar barra de progreso usando el ancho completo del video
          const progressBar = document.querySelector('#progress-bar');
          const currentTimeEl = document.querySelector('#current-time');
          const totalTimeEl = document.querySelector('#total-time');
          const progressDisplayEl = document.querySelector('#progress-display');
          
          if (progressBar) {
            const barWidth = this.data.width * progress; // Ancho completo del video
            const position = -this.data.width/2 + (barWidth / 2);
            
            progressBar.setAttribute('width', barWidth);
            progressBar.setAttribute('position', position + ' 0 0.01');
          }
          
          // Actualizar tiempos
          if (currentTimeEl) {
            currentTimeEl.setAttribute('value', this.formatTime(this.video.currentTime));
          }
          
          if (totalTimeEl) {
            totalTimeEl.setAttribute('value', this.formatTime(this.video.duration));
          }
          
          // Actualizar porcentaje
          if (progressDisplayEl) {
            const progressPercent = Math.round(progress * 100);
            progressDisplayEl.setAttribute('value', progressPercent + '%');
          }
        },
        
        seekVideo: function(event) {
          if (!this.video || !this.video.duration) return;
          
          try {
            // Obtener información del evento
            const intersection = event.detail.intersection;
            const uv = intersection.uv;
            const point = intersection.point;
            
            console.log('📍 Clic en barra de progreso:', point);
            
            let seekPercent = 0.5; // Valor por defecto
            
            if (uv) {
              // Usar coordenadas UV (más preciso)
              // uv.x = 0 es el inicio, uv.x = 1 es el final
              seekPercent = uv.x;
              console.log('🎯 Usando coordenadas UV - X:', uv.x, 'Progreso:', Math.round(seekPercent * 100) + '%');
            } else {
              // Fallback: usar coordenadas del mundo
              const progressControls = document.querySelector('#progress-controls');
              let baseX = 0;
              
              if (progressControls) {
                const pos = progressControls.getAttribute('position');
                baseX = pos.x;
              }
              
              const relativeX = point.x - baseX;
              const barStart = -this.data.width/2;
              const barEnd = this.data.width/2;
              
              seekPercent = (relativeX - barStart) / (barEnd - barStart);
              seekPercent = Math.max(0, Math.min(1, seekPercent));
              
              console.log('🎯 Usando coordenadas mundiales - X relativo:', relativeX, 'Progreso:', Math.round(seekPercent * 100) + '%');
            }
            
            const seekTime = this.video.duration * seekPercent;
            
            if (isFinite(seekTime) && !isNaN(seekTime)) {
              this.video.currentTime = seekTime;
              console.log("⏭️ Saltando a", this.formatTime(seekTime), "(" + Math.round(seekPercent * 100) + "%)");
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
              this.video.play()
                .then(() => {
                  const panelInfo = this.data.isRightPanel ? '(Panel derecho)' : '(Panel izquierdo)';
                  const volumeInfo = this.data.isRightPanel ? 'volumen 100%' : 'volumen 5%';
                  console.log('▶️ Video reproduciendo ' + panelInfo + ' - ' + volumeInfo);
                })
                .catch(err => console.error("Error al reproducir:", err));
            } else {
              this.video.pause();
              const panelInfo = this.data.isRightPanel ? '(Panel derecho)' : '(Panel izquierdo)';
              console.log("⏸️ Video pausado " + panelInfo);
            }
          } catch (error) {
            console.error("Error al controlar la reproducción:", error);
          }
        },
        
        // Función para actualizar el display visual del volumen
        updateVolumeDisplay: function() {
          if (!this.video) return;
          
          const volumeDisplay = document.querySelector('#volume-display');
          const volumeBar = document.querySelector('#volume-bar');
          
          if (volumeDisplay) {
            const volumePercent = Math.round(this.video.volume * 100);
            volumeDisplay.setAttribute('value', volumePercent + '%');
          }
          
          if (volumeBar) {
            // Actualizar altura de la barra según el volumen (0-100%)
            // La altura total es solo la del video
            const maxHeight = this.data.height; // Solo altura del video
            const barHeight = maxHeight * this.video.volume;
            const barPosition = (-maxHeight/2) + (barHeight / 2); // Centrar desde abajo
            
            volumeBar.setAttribute('height', barHeight);
            volumeBar.setAttribute('position', '0 ' + barPosition + ' 0.01');
            
            // Cambiar color según el nivel de volumen
            let color = '#000000'; // Negro para volumen normal
            if (this.video.volume === 0) {
              color = '#F44336'; // Rojo para silenciado
            } else if (this.video.volume < 0.3) {
              color = '#000000'; // Negro para volumen bajo
            }
            
            volumeBar.setAttribute('material', 'color: ' + color + '; shader: flat');
          }
        },
        
        // Función para ajustar volumen
        adjustVolume: function(direction) {
          if (!this.video) return;
          
          const step = 0.1; // Incremento de 10%
          let newVolume = this.video.volume;
          
          if (direction === 'up') {
            newVolume = Math.min(1.0, this.video.volume + step);
          } else if (direction === 'down') {
            newVolume = Math.max(0.0, this.video.volume - step);
          }
          
          this.video.volume = newVolume;
          
          // Log del cambio
          const panelInfo = this.data.isRightPanel ? '(Panel derecho)' : '(Panel izquierdo)';
          const action = direction === 'up' ? '🔊 Subiendo' : '🔉 Bajando';
          console.log(action + ' volumen ' + panelInfo + ': ' + Math.round(newVolume * 100) + '%');
          
          // Actualizar display inmediatamente
          this.updateVolumeDisplay();
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
          if (this.video) {
            this.video.pause();
            this.video.src = '';
            this.video.load();
            this.video = null;
          }
          console.log('Componente vr-local-video removido correctamente');
        }
      });

      // Componente para controles de progreso
      AFRAME.registerComponent('progress-control', {
        schema: {
          action: { type: 'string', default: 'seek' }
        },

        init: function() {
          this.el.addEventListener('click', this.handleProgressControl.bind(this));
          this.el.addEventListener('touchstart', this.onTouchStart.bind(this));
          this.el.addEventListener('touchend', this.onTouchEnd.bind(this));
          this.el.classList.add('clickable', 'raycastable');
        },

        onTouchStart: function(event) {
          event.preventDefault();
          this.touchStarted = true;
        },

        onTouchEnd: function(event) {
          event.preventDefault();
          if (this.touchStarted) {
            this.handleProgressControl(event);
            this.touchStarted = false;
          }
        },

        handleProgressControl: function(event) {
          console.log('📊 Control de progreso activado');
          
          // Buscar el componente de video
          const videoEntity = document.querySelector('#vr-local-video-entity');
          if (videoEntity && videoEntity.components['vr-local-video']) {
            const videoComponent = videoEntity.components['vr-local-video'];
            
            if (event && event.detail && event.detail.intersection) {
              console.log('🎯 Clic en barra de progreso detectado');
              videoComponent.seekVideo(event);
              
              // Feedback visual temporal
              this.provideFeedback();
            }
          } else {
            console.warn('⚠️ No se encontró el componente de video para progreso');
          }
        },

        provideFeedback: function() {
          // Feedback visual para la barra de progreso
          const progressBar = document.querySelector('#progress-bar');
          if (progressBar) {
            const originalColor = '#1565C0';
            const feedbackColor = '#FFFFFF';
            
            progressBar.setAttribute('material', 'color: ' + feedbackColor + '; shader: flat');
            setTimeout(() => {
              progressBar.setAttribute('material', 'color: ' + originalColor + '; shader: flat');
            }, 200);
          }
        }
      });

      // Componente para controles de volumen
      AFRAME.registerComponent('volume-control', {
        schema: {
          action: { type: 'string', default: 'up' } // 'up', 'down', o 'seek'
        },

        init: function() {
          this.el.addEventListener('click', this.handleVolumeControl.bind(this));
          this.el.addEventListener('touchstart', this.onTouchStart.bind(this));
          this.el.addEventListener('touchend', this.onTouchEnd.bind(this));
          this.el.classList.add('clickable', 'raycastable');
        },

        onTouchStart: function(event) {
          event.preventDefault();
          this.touchStarted = true;
        },

        onTouchEnd: function(event) {
          event.preventDefault();
          if (this.touchStarted) {
            this.handleVolumeControl(event);
            this.touchStarted = false;
          }
        },

        handleVolumeControl: function(event) {
          console.log('🎛️ Control de volumen activado, acción:', this.data.action);
          
          // Buscar el componente de video
          const videoEntity = document.querySelector('#vr-local-video-entity');
          if (videoEntity && videoEntity.components['vr-local-video']) {
            const videoComponent = videoEntity.components['vr-local-video'];
            
            if (this.data.action === 'seek' && event && event.detail && event.detail.intersection) {
              // Click directo en la barra para buscar posición
              console.log('🎯 Clic en barra de volumen detectado');
              this.seekVolume(event, videoComponent);
            } else {
              // Botones + y -
              console.log('🔘 Botón de volumen presionado:', this.data.action);
              videoComponent.adjustVolume(this.data.action);
            }
            
            // Feedback visual temporal
            this.provideFeedback();
          } else {
            console.warn('⚠️ No se encontró el componente de video');
          }
        },

        seekVolume: function(event, videoComponent) {
          try {
            // Obtener información del evento
            const intersection = event.detail.intersection;
            const object = intersection.object;
            const uv = intersection.uv;
            const point = intersection.point;
            
            console.log('📍 Información del clic:');
            console.log('- Punto mundial:', point);
            console.log('- UV coordinates:', uv);
            console.log('- Objeto:', object);
            
            // Si tenemos coordenadas UV, usarlas (más preciso)
            let newVolume = 0.5; // Valor por defecto
            
            if (uv) {
              // Las coordenadas UV van de 0 a 1
              // uv.y = 0 es la parte inferior, uv.y = 1 es la parte superior
              newVolume = uv.y;
              console.log('🎯 Usando coordenadas UV - Y:', uv.y, 'Volumen:', Math.round(newVolume * 100) + '%');
            } else {
              // Fallback: usar coordenadas del mundo
              const videoHeight = videoComponent.data.height;
              const volumeControls = document.querySelector('#volume-controls');
              
              let baseY = 0;
              if (volumeControls) {
                const pos = volumeControls.getAttribute('position');
                baseY = pos.y;
              }
              
              const relativeY = point.y - baseY;
              const barBottom = -videoHeight/2;
              const barTop = videoHeight/2;
              
              newVolume = (relativeY - barBottom) / (barTop - barBottom);
              newVolume = Math.max(0, Math.min(1, newVolume));
              
              console.log('🎯 Usando coordenadas mundiales - Y relativo:', relativeY, 'Volumen:', Math.round(newVolume * 100) + '%');
            }
            
            // Aplicar el nuevo volumen
            if (videoComponent.video) {
              videoComponent.video.volume = newVolume;
              videoComponent.updateVolumeDisplay();
              
              const panelInfo = videoComponent.data.isRightPanel ? '(Panel derecho)' : '(Panel izquierdo)';
              console.log('🎚️ Volumen ajustado por clic en barra ' + panelInfo + ': ' + Math.round(newVolume * 100) + '%');
            }
            
          } catch (error) {
            console.error("Error al buscar volumen:", error);
          }
        },

        provideFeedback: function() {
          // Feedback visual simple para botones + y -
          if (this.data.action === 'up' || this.data.action === 'down') {
            const originalColor = this.data.action === 'up' ? '#2196F3' : '#FF5722';
            const feedbackColor = '#FFFFFF';
            
            this.el.setAttribute('color', feedbackColor);
            setTimeout(() => {
              this.el.setAttribute('color', originalColor);
            }, 150);
          }
        }
      });

      console.log('Componente vr-local-video registrado correctamente');

      // Componente para el botón de ocultar/mostrar controles
      AFRAME.registerComponent('toggle-controls', {
        schema: {
          action: { type: 'string', default: 'toggle' }
        },

        init: function() {
          this.el.addEventListener('click', this.handleToggle.bind(this));
          this.el.addEventListener('touchstart', this.onTouchStart.bind(this));
          this.el.addEventListener('touchend', this.onTouchEnd.bind(this));
          this.el.classList.add('clickable', 'raycastable');
          
          // Estado inicial: controles visibles
          this.controlsVisible = true;
        },

        onTouchStart: function(event) {
          event.preventDefault();
          this.touchStarted = true;
        },

        onTouchEnd: function(event) {
          event.preventDefault();
          if (this.touchStarted) {
            this.handleToggle(event);
            this.touchStarted = false;
          }
        },

        handleToggle: function(event) {
          console.log('🔘 Botón de toggle controles presionado');
          
          // Alternar visibilidad de los controles
          this.controlsVisible = !this.controlsVisible;
          
          // Buscar los controles
          const progressControls = document.querySelector('#progress-controls');
          const volumeControls = document.querySelector('#volume-controls');
          const toggleButtonText = document.querySelector('#toggle-button-text');
          
          if (progressControls && volumeControls) {
            if (this.controlsVisible) {
              // Mostrar controles
              progressControls.setAttribute('visible', 'true');
              volumeControls.setAttribute('visible', 'true');
              if (toggleButtonText) {
                toggleButtonText.setAttribute('value', 'X');
              }
              console.log('👁️ Controles mostrados');
            } else {
              // Ocultar controles
              progressControls.setAttribute('visible', 'false');
              volumeControls.setAttribute('visible', 'false');
              if (toggleButtonText) {
                toggleButtonText.setAttribute('value', '👁️');
              }
              console.log('🙈 Controles ocultos');
            }
            
            // Feedback visual
            this.provideFeedback();
          } else {
            console.warn('⚠️ No se encontraron los controles para ocultar/mostrar');
          }
        },

        provideFeedback: function() {
          // Feedback visual para el botón
          const buttonBg = document.querySelector('#toggle-button-bg');
          if (buttonBg) {
            const originalColor = '#333333';
            const feedbackColor = '#555555';
            
            buttonBg.setAttribute('material', 'color: ' + feedbackColor + '; shader: flat; opacity: 0.8');
            setTimeout(() => {
              buttonBg.setAttribute('material', 'color: ' + originalColor + '; shader: flat; opacity: 0.8');
            }, 150);
          }
        }
      });

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
          }            // Comando de activar sonido
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
            // Comandos de volumen
            else if (command.includes('subir volumen') || command.includes('más volumen') || command.includes('volume up')) {
              console.log('🎤 Comando: Volume Up');
              this.updateVoiceText('🔊 Subiendo volumen');
              if (this.videoComponent) {
                this.videoComponent.adjustVolume('up');
              }
            }
            else if (command.includes('bajar volumen') || command.includes('menos volumen') || command.includes('volume down')) {
              console.log('🎤 Comando: Volume Down');
              this.updateVoiceText('🔉 Bajando volumen');
              if (this.videoComponent) {
                this.videoComponent.adjustVolume('down');
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
          ${generateProgressControls()}
          ${generateVolumeControls()}
          ${generateToggleButton()}
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
              raycaster="objects: .clickable, .raycastable; far: 30; interval: 100"
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
