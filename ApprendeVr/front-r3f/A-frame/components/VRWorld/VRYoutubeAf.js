/* global AFRAME */
AFRAME.registerComponent('vr-youtube', {
  schema: {
    width: { type: 'number', default: 4 },
    height: { type: 'number', default: 2.25 },
    videoId: { type: 'string', default: 'dQw4w9WgXcQ' }
  },

  init: function() {
    // Cargar la API de YouTube
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    // Crear un div para el player de YouTube
    this.playerEl = document.createElement('div');
    this.playerEl.setAttribute('id', `youtube-player-${Math.random().toString(36).substr(2, 9)}`);
    this.playerEl.style.display = 'none';
    document.body.appendChild(this.playerEl);

    // Crear el plano para el video
    this.videoPlane = document.createElement('a-plane');
    this.videoPlane.setAttribute('width', this.data.width);
    this.videoPlane.setAttribute('height', this.data.height);
    this.el.appendChild(this.videoPlane);

    // Crear los botones de control
    this.createControls();

    // Inicializar el player cuando la API esté lista
    window.onYouTubeIframeAPIReady = () => {
      this.player = new YT.Player(this.playerEl.id, {
        videoId: this.data.videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          enablejsapi: 1,
          modestbranding: 1,
          rel: 0,
          showinfo: 0
        },
        events: {
          'onReady': this.onPlayerReady.bind(this)
        }
      });
    };
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

  onPlayerReady: function(event) {
    // Crear una textura dinámica con el elemento de video
    const videoEl = event.target.getIframe();
    const videoTexture = new THREE.VideoTexture(videoEl);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;

    // Aplicar la textura al plano
    const material = new THREE.MeshBasicMaterial({ map: videoTexture });
    this.videoPlane.getObject3D('mesh').material = material;
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
