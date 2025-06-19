/* global AFRAME */
AFRAME.registerComponent('vr-youtube-stream', {
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
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 1000;

    // Initialize the base component
    this.el.setAttribute('vr-youtube-base', this.data);

    // Create video element
    this.videoEl = document.createElement('video');
    this.videoEl.setAttribute('crossorigin', 'anonymous');
    this.videoEl.setAttribute('playsinline', '');
    this.videoEl.setAttribute('webkit-playsinline', '');
    this.videoEl.setAttribute('preload', 'auto');
    document.body.appendChild(this.videoEl);

    // Create canvas for rendering YouTube frames
    this.canvas = document.createElement('canvas');
    this.canvas.width = 854;
    this.canvas.height = 480;
    this.canvas.style.display = 'none';
    document.body.appendChild(this.canvas);
    this.canvasCtx = this.canvas.getContext('2d');

    // Create media stream from canvas
    this.canvasStream = this.canvas.captureStream(30);
    this.videoEl.srcObject = this.canvasStream;

    // Connect control events
    this.el.addEventListener('video-play', () => {
      if (this.player && this.isPlayerReady) {
        this.player.playVideo();
        this.startRenderingFrames();
      }
    });

    this.el.addEventListener('video-pause', () => {
      if (this.player && this.isPlayerReady) {
        this.player.pauseVideo();
        this.stopRenderingFrames();
      }
    });

    // Setup video
    this.setupVideo();
  },

  setupVideo: function() {
    const videoPlane = this.el.querySelector('[geometry]');
    
    if (videoPlane) {
      // Create texture and material
      this.videoTexture = new THREE.VideoTexture(this.videoEl);
      this.videoTexture.minFilter = THREE.LinearFilter;
      this.videoTexture.magFilter = THREE.LinearFilter;
      
      const material = new THREE.MeshBasicMaterial({
        map: this.videoTexture,
        side: THREE.DoubleSide
      });

      const mesh = videoPlane.getObject3D('mesh');
      if (mesh) {
        mesh.material = material;
      }

      // Load YouTube API and initialize player
      this.initializeYouTubeAPI()
        .then(() => this.createYouTubePlayer())
        .catch(error => console.error('Failed to initialize YouTube player:', error));
    }
  },

  initializeYouTubeAPI: function() {
    return new Promise((resolve, reject) => {
      // If API is already loaded
      if (window.YT && window.YT.Player) {
        this.isAPIReady = true;
        resolve();
        return;
      }

      // Save existing callback if any
      const existingCallback = window.onYouTubeIframeAPIReady;

      // Set up new callback
      window.onYouTubeIframeAPIReady = () => {
        if (existingCallback) existingCallback();
        this.isAPIReady = true;
        resolve();
      };

      // If script is already loading, just wait for callback
      if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        return;
      }

      // Load API script
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.onerror = () => reject(new Error('Failed to load YouTube API'));
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    });
  },

  createYouTubePlayer: function() {
    // Create container for player
    this.container = document.createElement('div');
    this.container.id = `youtube-player-${Math.random().toString(36).substr(2, 9)}`;
    this.container.style.display = 'none';
    document.body.appendChild(this.container);

    return new Promise((resolve, reject) => {
      if (!this.isAPIReady) {
        this.retryCount++;
        if (this.retryCount < this.maxRetries) {
          console.warn(`YouTube API not ready, attempt ${this.retryCount}/${this.maxRetries}`);
          setTimeout(() => this.createYouTubePlayer(), this.retryDelay);
          return;
        } else {
          reject(new Error('YouTube API failed to load after maximum retries'));
          return;
        }
      }

      try {
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
            onReady: (event) => {
              this.isPlayerReady = true;
              this.handlePlayerReady(event);
              resolve();
            },
            onStateChange: (event) => this.handlePlayerStateChange(event),
            onError: (event) => {
              console.error('YouTube player error:', event.data);
              reject(new Error(`YouTube player error: ${event.data}`));
            }
          }
        });
      } catch (error) {
        reject(error);
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

  handlePlayerReady: function(event) {
    if (this.data.autoplay) {
      this.player.playVideo();
      this.startRenderingFrames();
      this.videoEl.play().catch(e => console.warn('Autoplay failed:', e));
    }
  },

  handlePlayerStateChange: function(event) {
    if (!this.videoEl) return;

    switch(event.data) {
      case YT.PlayerState.PLAYING:
        this.startRenderingFrames();
        this.videoEl.play().catch(e => console.warn('Play failed:', e));
        break;
      case YT.PlayerState.PAUSED:
        this.stopRenderingFrames();
        this.videoEl.pause();
        break;
      case YT.PlayerState.ENDED:
        this.stopRenderingFrames();
        this.videoEl.pause();
        this.el.emit('video-ended');
        break;
    }
  },

  remove: function() {
    this.stopRenderingFrames();
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.remove();
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
