// Importar componentes principales
import './components/VRWorld/VRFloorAf.js';
import './components/VRUserAf/VRUserAf.js';

// Registrar componente personalizado para el video
AFRAME.registerComponent('video-player', {
  schema: {
    src: { type: 'string', default: '/videos/sample.mp4' }
  },
  
  init: function() {
    // Crear elemento de video
    this.video = document.createElement('video');
    this.video.crossOrigin = 'anonymous';
    this.video.loop = true;
    this.video.muted = true;
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
    
    // Obtener elementos
    const el = this.el;
    this.videoPlane = el.querySelector('#video-plane');
    this.progressBar = el.querySelector('#progress-bar');
    this.timeDisplay = el.querySelector('#time-display');
    this.progressBarBg = el.querySelector('#progress-bar-background');
    
    // Configurar listeners
    this.video.addEventListener('timeupdate', this.updateProgress.bind(this));
    this.videoPlane.addEventListener('click', this.togglePlay.bind(this));
    if (this.progressBarBg) {
      this.progressBarBg.addEventListener('click', this.seekVideo.bind(this));
    }
    
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
    
    const barWidth = 16 * progress; // 16 es el ancho total
    const position = -8 + (barWidth / 2);
    
    if (this.progressBar) {
      this.progressBar.setAttribute('width', barWidth);
      this.progressBar.setAttribute('position', `${position} 0 0.01`);
    }
    
    // Actualizar texto de tiempo
    if (this.timeDisplay) {
      const timeText = this.formatTime(this.video.currentTime) + ' / ' + this.formatTime(this.video.duration);
      this.timeDisplay.setAttribute('value', timeText);
    }
  },
  
  // Saltar a posición
  seekVideo: function(event) {
    if (!this.video || !this.video.duration || !this.progressBarBg) return;
    
    try {
      // Obtener posición del clic relativa a la barra
      const progressRect = this.progressBarBg.object3D.el.object3D.matrixWorld;
      const progressWidth = 16; // Ancho total de la barra
      
      // Calcular posición relativa del clic
      const mousePos = event.detail.intersection.point;
      const progressStart = -8; // Posición inicial de la barra
      
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

// Configuración inicial
document.addEventListener('DOMContentLoaded', function() {
  // Asegurarse de que el cursor siga al mouse y funcione el raycaster
  const scene = document.querySelector('a-scene');
  if (!scene.hasLoaded) {
    scene.addEventListener('loaded', function() {
      console.log('Scene loaded, components ready');
    });
  }
});
