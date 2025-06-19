/* global AFRAME, THREE */
AFRAME.registerComponent('vr-youtube', {
  schema: {
    width: { type: 'number', default: 4 },
    height: { type: 'number', default: 2.25 },
    videoId: { type: 'string', default: 'dQw4w9WgXcQ' },
    position: { type: 'vec3', default: {x: 0, y: 2, z: -5} },
    rotation: { type: 'vec3', default: {x: 0, y: 0, z: 0} },
    autoplay: { type: 'boolean', default: false }
  },

  init: function() {
    this.el.setAttribute('position', this.data.position);
    this.el.setAttribute('rotation', this.data.rotation);

    // Crear un div para el player de YouTube
    this.playerEl = document.createElement('div');
    this.playerEl.id = `youtube-player-${Math.random().toString(36).substr(2, 9)}`;
    this.playerEl.style.position = 'fixed';
    this.playerEl.style.left = '0';
    this.playerEl.style.top = '0';
    this.playerEl.style.zIndex = '-1000';
    this.playerEl.style.width = '854px';  // Resolución estándar de YouTube
    this.playerEl.style.height = '480px';
    this.playerEl.style.opacity = '0';
    document.body.appendChild(this.playerEl);

    // Crear el plano para el video
    this.videoPlane = document.createElement('a-entity');
    this.videoPlane.setAttribute('geometry', {
      primitive: 'plane',
      width: this.data.width,
      height: this.data.height
    });
    
    // Crear material básico inicialmente negro
    this.videoPlane.setAttribute('material', {
      shader: 'flat',
      side: 'double',
      color: '#000000'
    });
    
    this.el.appendChild(this.videoPlane);

    // Crear los botones de control
    this.createControls();

    // Cargar la API de YouTube
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube-nocookie.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      
      window.onYouTubeIframeAPIReady = () => {
        this.createPlayer();
      };
    } else {
      this.createPlayer();
    }
  },

  createPlayer: function() {
    this.player = new YT.Player(this.playerEl.id, {
      videoId: this.data.videoId,
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        autoplay: this.data.autoplay ? 1 : 0,
        controls: 0,
        enablejsapi: 1,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        playsinline: 1,
        origin: window.location.origin
      },
      events: {
        onReady: (event) => {
          // Crear textura cuando el player esté listo
          const iframe = event.target.getIframe();
          const videoTexture = new THREE.VideoTexture(iframe);
          videoTexture.minFilter = THREE.LinearFilter;
          videoTexture.magFilter = THREE.LinearFilter;
          
          // Aplicar la textura al material
          const material = new THREE.MeshBasicMaterial({
            map: videoTexture,
            side: THREE.DoubleSide
          });
          
          // Actualizar el material del plano
          const mesh = this.videoPlane.getObject3D('mesh');
          if (mesh) {
            mesh.material = material;
          }

          // Si autoplay está activado, reproducir
          if (this.data.autoplay) {
            this.player.playVideo();
          }
        },
        onStateChange: (event) => {
          // Puedes manejar cambios de estado aquí si lo necesitas
        }
      }
    });
  },

  createControls: function() {
    // Botón Play
    const playButton = document.createElement('a-plane');
    playButton.setAttribute('width', 0.5);
    playButton.setAttribute('height', 0.5);
    playButton.setAttribute('position', {
      x: -0.6,
      y: -this.data.height/2 - 0.3,
      z: 0.01
    });
    playButton.setAttribute('material', 'color: #4CAF50');
    playButton.setAttribute('class', 'clickable');
    
    const playText = document.createElement('a-text');
    playText.setAttribute('value', 'Play');
    playText.setAttribute('align', 'center');
    playText.setAttribute('position', '0 0 0.01');
    playText.setAttribute('scale', '0.5 0.5 0.5');
    playText.setAttribute('color', 'white');
    playButton.appendChild(playText);

    // Botón Pause
    const pauseButton = document.createElement('a-plane');
    pauseButton.setAttribute('width', 0.5);
    pauseButton.setAttribute('height', 0.5);
    pauseButton.setAttribute('position', {
      x: 0.6,
      y: -this.data.height/2 - 0.3,
      z: 0.01
    });
    pauseButton.setAttribute('material', 'color: #f44336');
    pauseButton.setAttribute('class', 'clickable');
    
    const pauseText = document.createElement('a-text');
    pauseText.setAttribute('value', 'Pause');
    pauseText.setAttribute('align', 'center');
    pauseText.setAttribute('position', '0 0 0.01');
    pauseText.setAttribute('scale', '0.5 0.5 0.5');
    pauseText.setAttribute('color', 'white');
    pauseButton.appendChild(pauseText);

    // Agregar event listeners
    playButton.addEventListener('click', () => {
      if (this.player && this.player.playVideo) {
        this.player.playVideo();
      }
    });

    pauseButton.addEventListener('click', () => {
      if (this.player && this.player.pauseVideo) {
        this.player.pauseVideo();
      }
    });

    this.el.appendChild(playButton);
    this.el.appendChild(pauseButton);
  },

  remove: function() {
    if (this.playerEl && this.playerEl.parentNode) {
      this.playerEl.parentNode.removeChild(this.playerEl);
    }
    if (this.player) {
      this.player.destroy();
    }
  }
});
