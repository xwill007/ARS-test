/* global AFRAME */
AFRAME.registerComponent('vr-youtube-iframe', {
  // Extender el esquema base
  schema: {
    width: { type: 'number', default: 4 },
    height: { type: 'number', default: 2.25 },
    videoId: { type: 'string', default: 'M7lc1UVf-VE' },
    autoplay: { type: 'boolean', default: false }
  },

  init: function() {
    // Inicializar el componente base
    this.el.setAttribute('vr-youtube-base', this.data);

    // Crear contenedor para el iframe
    this.container = document.createElement('div');
    this.container.id = `youtube-iframe-${Math.random().toString(36).substr(2, 9)}`;
    this.container.style.display = 'none';
    document.body.appendChild(this.container);

    // Cargar el API de YouTube
    this.loadYouTubeAPI();
  },

  loadYouTubeAPI: function() {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube-nocookie.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = this.createPlayer.bind(this);
    } else {
      this.createPlayer();
    }
  },

  createPlayer: function() {
    this.player = new YT.Player(this.container.id, {
      videoId: this.data.videoId,
      width: 854,
      height: 480,
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
        onReady: this.onPlayerReady.bind(this),
        onStateChange: this.onPlayerStateChange.bind(this)
      }
    });
  },

  onPlayerReady: function(event) {
    const iframe = event.target.getIframe();
    const videoPlane = this.el.querySelector('[geometry]');
    
    if (videoPlane) {
      const material = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide
      });

      const texture = new THREE.VideoTexture(iframe);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      material.map = texture;

      const mesh = videoPlane.getObject3D('mesh');
      if (mesh) {
        mesh.material = material;
      }

      // Actualizar textura continuamente
      const animate = () => {
        if (this.player) {
          texture.needsUpdate = true;
          requestAnimationFrame(animate);
        }
      };
      animate();
    }

    // Conectar eventos de control
    this.el.addEventListener('video-play', () => {
      if (this.player && this.player.playVideo) {
        this.player.playVideo();
      }
    });

    this.el.addEventListener('video-pause', () => {
      if (this.player && this.player.pauseVideo) {
        this.player.pauseVideo();
      }
    });

    if (this.data.autoplay) {
      this.player.playVideo();
    }
  },

  onPlayerStateChange: function(event) {
    // Manejar cambios de estado si es necesario
  },

  remove: function() {
    if (this.container) {
      this.container.remove();
    }
    if (this.player) {
      this.player.destroy();
    }
  }
});
