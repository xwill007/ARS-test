/* global AFRAME */
AFRAME.registerComponent('vr-youtube-video', {
  schema: {
    width: { type: 'number', default: 4 },
    height: { type: 'number', default: 2.25 },
    videoId: { type: 'string', default: 'M7lc1UVf-VE' },
    autoplay: { type: 'boolean', default: false }
  },

  init: function() {
    // Initialize state
    this.isAPIReady = false;
    this.isPlayerReady = false;

    // Initialize the base component
    this.el.setAttribute('vr-youtube-base', this.data);

    // Create video element with canvas as source
    this.video = document.createElement('video');
    this.video.crossOrigin = 'anonymous';
    this.video.playsInline = true;
    this.video.style.display = 'none';
    document.body.appendChild(this.video);

    // Create canvas for rendering YouTube frames
    this.canvas = document.createElement('canvas');
    this.canvas.width = 854;
    this.canvas.height = 480;
    this.canvas.style.display = 'none';
    document.body.appendChild(this.canvas);
    this.canvasCtx = this.canvas.getContext('2d');

    // Create media stream from canvas
    this.canvasStream = this.canvas.captureStream(30);
    this.video.srcObject = this.canvasStream;

    // Create container for YouTube
    this.container = document.createElement('div');
    this.container.id = `youtube-video-${Math.random().toString(36).substr(2, 9)}`;
    this.container.style.display = 'none';
    document.body.appendChild(this.container);

    // Load the API of YouTube
    this.loadYouTubeAPI();

    // Connect control events
    this.el.addEventListener('video-play', () => {
      if (this.player && this.player.playVideo) {
        this.player.playVideo();
        this.startRenderingFrames();
      }
    });

    this.el.addEventListener('video-pause', () => {
      if (this.player && this.player.pauseVideo) {
        this.player.pauseVideo();
        this.stopRenderingFrames();
      }
    });
  },

  loadYouTubeAPI: function() {
    if (window.YT && window.YT.Player) {
      this.isAPIReady = true;
      this.createPlayer();
      return;
    }

    const oldCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (oldCallback) oldCallback();
      this.isAPIReady = true;
      this.createPlayer();
    };

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  },

  createPlayer: function() {
    this.player = new YT.Player(this.container.id, {
      videoId: this.data.videoId,
      width: this.canvas.width,
      height: this.canvas.height,
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

  startRenderingFrames: function() {
    if (this.renderInterval) return;
    
    this.renderInterval = setInterval(() => {
      try {
        const iframe = this.player.getIframe();
        if (iframe) {
          // Draw the iframe contents to our canvas
          this.canvasCtx.drawImage(iframe, 0, 0, this.canvas.width, this.canvas.height);
        }
      } catch (e) {
        console.warn('Error rendering frame:', e);
      }
    }, 1000 / 30); // 30 FPS
  },

  stopRenderingFrames: function() {
    if (this.renderInterval) {
      clearInterval(this.renderInterval);
      this.renderInterval = null;
    }
  },

  onPlayerReady: function(event) {
    this.isPlayerReady = true;
    const videoPlane = this.el.querySelector('[geometry]');
    
    if (videoPlane) {
      // Create video texture
      const videoTexture = new THREE.VideoTexture(this.video);
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;

      const material = new THREE.MeshBasicMaterial({
        map: videoTexture,
        side: THREE.DoubleSide
      });

      const mesh = videoPlane.getObject3D('mesh');
      if (mesh) {
        mesh.material = material;
      }
    }

    if (this.data.autoplay) {
      this.player.playVideo();
      this.startRenderingFrames();
    }
  },

  onPlayerStateChange: function(event) {
    switch(event.data) {
      case YT.PlayerState.PLAYING:
        this.video.play();
        this.startRenderingFrames();
        break;
      case YT.PlayerState.PAUSED:
        this.video.pause();
        this.stopRenderingFrames();
        break;
      case YT.PlayerState.ENDED:
        this.video.pause();
        this.stopRenderingFrames();
        this.el.emit('video-ended');
        break;
    }
  },

  remove: function() {
    this.stopRenderingFrames();
    if (this.video) {
      this.video.pause();
      this.video.remove();
    }
    if (this.canvas) {
      this.canvas.remove();
    }
    if (this.container) {
      this.container.remove();
    }
    if (this.player) {
      this.player.destroy();
    }
  }
});
