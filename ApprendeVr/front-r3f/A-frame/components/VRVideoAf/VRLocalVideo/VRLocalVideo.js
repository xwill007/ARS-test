AFRAME.registerComponent('vr-local-video', {
  schema: {
    width: { type: 'number', default: 16 },
    height: { type: 'number', default: 9 },
    position: { type: 'vec3', default: { x: 0, y: 2, z: -5 } },
    rotation: { type: 'vec3', default: { x: 0, y: 0, z: 0 } },
    src: { type: 'string', default: '/videos/gangstas.mp4' }
  },
  init: function () {
    console.log('Iniciando componente vr-local-video');
    
    // Crear ID único para el video
    this.videoId = 'video-' + Math.floor(Math.random() * 1000000);
    
    this.setupVideo();
    this.video.addEventListener('loadedmetadata', () => {
      console.log('Video metadata cargada');
      this.setupVideoPlane();
      this.setupPlayButton();
    });
  },
  setupVideo: function () {
    // Create video element
    this.video = document.createElement('video');
    this.video.src = this.data.src;
    this.video.crossOrigin = 'anonymous';
    this.video.loop = true;
    this.video.muted = true; // Inicialmente silenciado para evitar problemas de autoplay
    this.video.setAttribute('playsinline', '');
    this.video.setAttribute('webkit-playsinline', '');
    this.video.load(); // Asegurar que el video se cargue correctamente
  },
  setupVideoPlane: function () {
    // Create video plane
    this.videoPlane = document.createElement('a-plane');
    this.videoPlane.setAttribute('width', this.data.width);
    this.videoPlane.setAttribute('height', this.data.height);
    this.videoPlane.setAttribute('position', this.data.position);
    this.videoPlane.setAttribute('rotation', this.data.rotation);
    
    // Set up video material using A-Frame's material system
    this.videoPlane.setAttribute('material', {
      shader: 'flat',
      src: this.video
    });
    
    this.el.appendChild(this.videoPlane);
  },  setupPlayButton: function () {
    // Create play button
    this.playButton = document.createElement('a-plane');
    
    // Calculate button position (centered at bottom of video)
    const buttonWidth = 1;
    const buttonHeight = 1;
    const buttonY = -(this.data.height / 2) - (buttonHeight / 2) - 0.5;
    
    // Configurar el botón
    this.playButton.setAttribute('width', buttonWidth);
    this.playButton.setAttribute('height', buttonHeight);
    this.playButton.setAttribute('position', `0 ${buttonY} 0.01`);
    this.playButton.setAttribute('material', 'color: #00ff00');
    this.playButton.setAttribute('class', 'clickable');
    
    // Guardar una referencia del video en el elemento principal
    this.el.video = this.video;
    
    // Usar el ID único para establecer un selector para el video
    this.video.id = this.videoId;
    
    // Hacer que el video sea global
    window[`video_${this.videoId}`] = this.video;
    
    // Añadir componente de botón de reproducción
    this.playButton.setAttribute('play-button', `videoId: ${this.videoId}`);
    
    this.videoPlane.appendChild(this.playButton);
  },
    togglePlayback: function() {
    if (this.video.paused) {
      console.log('Reproduciendo video');
      this.video.muted = false;
      const playPromise = this.video.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('Video reproduciendo correctamente');
          // El botón cambiará de color a través del evento 'play' en el componente play-button
        }).catch(error => {
          console.error('Error al reproducir:', error);
          this.video.muted = true;
          this.video.play().catch(e => console.error('No se pudo reproducir ni con mute:', e));
        });
      }
    } else {
      console.log('Pausando video');
      this.video.pause();
      // El botón cambiará de color a través del evento 'pause' en el componente play-button
    }
  },

  remove: function () {
    if (this.video) {
      this.video.pause();
      this.video.remove();
    }
    if (this.videoPlane) {
      this.videoPlane.remove();
    }
  }
});
