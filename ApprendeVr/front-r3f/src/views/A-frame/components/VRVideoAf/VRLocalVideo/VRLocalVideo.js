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
    doubleSided: { type: 'boolean', default: true },  // Propiedad para controlar si es de doble cara
    invertBackSide: { type: 'boolean', default: true } // Propiedad para invertir la imagen del lado posterior
  },
    init: function() {
    console.log('Iniciando componente vr-local-video');
    
    // Crear estructura de elementos
    this.createVideoElements();
    
    // Crear elemento de video principal
    this.video = document.createElement('video');
    this.video.crossOrigin = 'anonymous';
    this.video.loop = true;
    this.video.muted = true; // Inicialmente silenciado para autoplay
    this.video.playsInline = true;
    this.video.setAttribute('playsinline', '');
    this.video.setAttribute('webkit-playsinline', '');
      // Crear funciones vinculadas para event listeners
    this.onCanPlayThrough = () => {
      console.log('Video cargado completamente - canplaythrough');
    };
    
    this.onLoadedMetadata = () => {
      console.log('Video metadata cargada', this.video.videoWidth, this.video.videoHeight, this.video.duration);
      this.updateProgress();
    };
    
    // Asegurarse de que el video está completamente cargado
    this.video.addEventListener('canplaythrough', this.onCanPlayThrough);
    
    // Asegurarse de tener metadata
    this.video.addEventListener('loadedmetadata', this.onLoadedMetadata);
    
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
    if (this.data.doubleSided && this.data.invertBackSide) {
      // Configuramos el plano frontal
      this.videoPlane.setAttribute('material', {
        shader: 'flat',
        src: this.video,
        side: 'front'  // Solo mostrar por el frente
      });
      
      // Si tenemos plano trasero, configurar su material con la misma fuente de video
      if (this.backVideoPlane) {
        console.log('Configurando plano trasero invertido');
        
        // Creamos un elemento de canvas para invertir el video manualmente
        const canvas = document.createElement('canvas');
        const backCtx = canvas.getContext('2d');
        
        // Ajustar tamaño del canvas una vez tengamos los metadatos del video
        this.video.addEventListener('loadedmetadata', () => {
          const videoWidth = this.video.videoWidth || 640;
          const videoHeight = this.video.videoHeight || 360;
          
          canvas.width = videoWidth;
          canvas.height = videoHeight;
            // Almacenar referencias para limpieza
          this.backCtx = backCtx;
          
          // Función para actualizar el canvas en cada frame
          const updateCanvas = () => {
            if (this.video && this.video.readyState >= 2) {  // Tenemos datos suficientes
              // Dibujar el video invertido horizontalmente
              this.backCtx.save();
              this.backCtx.scale(-1, 1);
              this.backCtx.drawImage(this.video, -canvas.width, 0, canvas.width, canvas.height);
              this.backCtx.restore();
            }
            
            // Actualizar en cada frame disponible
            this.updateCanvasRAF = requestAnimationFrame(updateCanvas);
          };
          
          // Iniciar la actualización
          updateCanvas();
        });
        
        // Configurar el plano trasero con el canvas como fuente
        this.backVideoPlane.setAttribute('material', {
          shader: 'flat',
          src: canvas,
          side: 'double'  // Asegurar que se vea bien
        });
      }
    } else {
      // Configuración estándar para doble cara sin inversión
      this.videoPlane.setAttribute('material', {
        shader: 'flat',
        src: this.video,
        side: this.data.doubleSided ? 'double' : 'front'
      });
    }
    
    // Intentar reproducir automáticamente
    this.attemptAutoplay();
  },
  
  createVideoElements: function() {
    const el = this.el;
    
    // Crear plano principal para el video (frontal)
    this.videoPlane = document.createElement('a-plane');
    this.videoPlane.setAttribute('width', this.data.width);
    this.videoPlane.setAttribute('height', this.data.height);
    this.videoPlane.setAttribute('material', 'shader: flat');
    this.videoPlane.classList.add('clickable');
    this.videoPlane.id = 'video-plane-' + Math.floor(Math.random() * 10000);
    
    // Si queremos doble cara con inversión, creamos un segundo plano
    if (this.data.doubleSided && this.data.invertBackSide) {
      this.backVideoPlane = document.createElement('a-plane');
      this.backVideoPlane.setAttribute('width', this.data.width);
      this.backVideoPlane.setAttribute('height', this.data.height);
      this.backVideoPlane.setAttribute('material', 'shader: flat');
      this.backVideoPlane.classList.add('clickable');
      this.backVideoPlane.id = 'back-video-plane-' + Math.floor(Math.random() * 10000);
        // Para el plano trasero, lo posicionamos exactamente en la misma posición que el plano frontal
      // No aplicamos rotación para evitar posibles problemas con la visualización
      this.backVideoPlane.setAttribute('position', '0 0 -0.01'); // Muy ligeramente detrás del plano principal
      
      // Invertimos horizontalmente el plano trasero para corregir el efecto espejo
      this.backVideoPlane.setAttribute('scale', '-1 1 1');
    }
    
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
    
    // Si tenemos plano trasero, añadirlo también
    if (this.backVideoPlane) {
      el.appendChild(this.backVideoPlane);
    }
    
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
    // Detener cualquier animación o proceso que esté en marcha
    if (this.updateCanvasRAF) {
      cancelAnimationFrame(this.updateCanvasRAF);
      this.updateCanvasRAF = null;
    }
    
    // Limpiar el video
    if (this.video) {
      this.video.pause();
      
      // Eliminar event listeners del video
      this.video.removeEventListener('canplaythrough', this.onCanPlayThrough);
      this.video.removeEventListener('loadedmetadata', this.onLoadedMetadata);
      this.video.removeEventListener('timeupdate', this.updateProgress);
      
      // Limpiar la fuente
      this.video.src = '';
      this.video.load();
      this.video = null;
    }
    
    // Limpiar event listeners de los elementos UI
    if (this.videoPlane) {
      this.videoPlane.removeEventListener('click', this.togglePlay);
    }
    
    if (this.backVideoPlane) {
      this.backVideoPlane.removeEventListener('click', this.togglePlay);
    }
    
    if (this.progressBarBg) {
      this.progressBarBg.removeEventListener('click', this.seekVideo);
    }
    
    // Referencia al contexto del canvas (si existe)
    if (this.backCtx) {
      this.backCtx = null;
    }
    
    console.log('Componente vr-local-video removido correctamente');
  }
});

export default {}; // Exportar algo para que funcione el import
