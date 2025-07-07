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
      allow="autoplay; fullscreen"
    />
  );
};

export default VRLocalVideoOverlay;
