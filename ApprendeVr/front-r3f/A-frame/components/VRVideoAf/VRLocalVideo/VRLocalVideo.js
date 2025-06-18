// Componente para reproducir video local con barra de progreso
// Este componente encapsula toda la funcionalidad para reproducir videos locales en A-Frame

AFRAME.registerComponent('vr-local-video', {
  schema: {
    src: { type: 'string', default: '/videos/sample.mp4' },
    width: { type: 'number', default: 16 },
    height: { type: 'number', default: 9 },
    position: { type: 'vec3', default: { x: 0, y: 0, z: 0 } },
    rotation: { type: 'vec3', default: { x: 0, y: 0, z: 0 } },
    autoplay: { type: 'boolean', default: false }
  },
  
  init: function() {
    console.log('Iniciando componente vr-local-video');
    
    // Crear estructura de elementos
    this.createVideoElements();
    
    // Crear elemento de video
    this.video = document.createElement('video');
    this.video.crossOrigin = 'anonymous';
    this.video.loop = true;
    this.video.muted = true; // Inicialmente silenciado para autoplay
    this.video.playsInline = true;
    this.video.setAttribute('playsinline', '');
    this.video.setAttribute('webkit-playsinline', '');
    
    // Asegurarse de que el video está completamente cargado
    this.video.addEventListener('canplaythrough', () => {
      console.log('Video cargado completamente - canplaythrough');
    });
    
    // Asegurarse de tener metadata
    this.video.addEventListener('loadedmetadata', () => {
      console.log('Video metadata cargada', this.video.videoWidth, this.video.videoHeight, this.video.duration);
      this.updateProgress();
    });
    
    // Configurar listeners
    this.video.addEventListener('timeupdate', this.updateProgress.bind(this));
    this.videoPlane.addEventListener('click', this.togglePlay.bind(this));
    this.progressBarBg.addEventListener('click', this.seekVideo.bind(this));
    
    // Cargar el video
    this.video.src = this.data.src;
    this.video.load();
    
    // Aplicar textura
    this.videoPlane.setAttribute('material', {
      shader: 'flat',
      src: this.video
    });
    
    // Intentar reproducir automáticamente
    this.attemptAutoplay();
  },
  
  createVideoElements: function() {
    const el = this.el;
    
    // Crear plano para el video
    this.videoPlane = document.createElement('a-plane');
    this.videoPlane.setAttribute('width', this.data.width);
    this.videoPlane.setAttribute('height', this.data.height);
    this.videoPlane.setAttribute('material', 'shader: flat');
    this.videoPlane.classList.add('clickable');
    this.videoPlane.id = 'video-plane-' + Math.floor(Math.random() * 10000);
    
    // Contenedor para barra de progreso (posicionado debajo del video)
    const progressContainer = document.createElement('a-entity');
    progressContainer.setAttribute('position', `0 ${-this.data.height/2 - 0.5} 0.01`);
    
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
    this.progressBar.setAttribute('position', `${-this.data.width/2} 0 0.01`);
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
  
  // Formatear tiempo (segundos -> MM:SS)
  formatTime: function(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  },
  
  // Actualizar barra de progreso
  updateProgress: function() {
    if (!this.video || !this.video.duration || isNaN(this.video.duration)) {
      return;
    }
    
    // Actualizar barra
    const progress = this.video.currentTime / this.video.duration;
    if (isNaN(progress)) return;
    
    const barWidth = this.data.width * progress;
    const position = -this.data.width/2 + (barWidth / 2);
    
    this.progressBar.setAttribute('width', barWidth);
    this.progressBar.setAttribute('position', `${position} 0 0.01`);
    
    // Actualizar texto de tiempo
    const timeText = this.formatTime(this.video.currentTime) + ' / ' + this.formatTime(this.video.duration);
    this.timeDisplay.setAttribute('value', timeText);
  },
  
  // Saltar a posición
  seekVideo: function(event) {
    if (!this.video || !this.video.duration) return;
    
    try {
      // Obtener posición del clic relativa a la barra
      const mousePos = event.detail.intersection.point;
      const progressWidth = this.data.width;
      const progressStart = -this.data.width/2;
      
      // Convertir posición a rango 0-1
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
  
  // Alternar reproducción
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
    // Intentar reproducción automática
  attemptAutoplay: function() {
    // Verificar si el autoplay está habilitado
    if (!this.data.autoplay) {
      console.log("Autoplay deshabilitado por configuración");
      return; // No intentar reproducir automáticamente
    }
    
    console.log("Intentando autoplay...");
    const playPromise = this.video.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log("Autoplay funcionando (muted)");
        })
        .catch(error => {
          console.warn("Error en autoplay:", error);
          // No hacer nada, esperar por interacción del usuario
        });
    }
  },
  
  remove: function() {
    if (this.video) {
      this.video.pause();
      this.video.src = '';
      this.video.load();
    }
  }
});

export default {}; // Exportar algo para que funcione el import
