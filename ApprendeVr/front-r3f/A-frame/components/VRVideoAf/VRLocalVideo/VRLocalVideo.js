AFRAME.registerComponent('vr-local-video', {
  schema: {
    width: { type: 'number', default: 16 },
    height: { type: 'number', default: 9 },
    position: { type: 'vec3', default: { x: 0, y: 2, z: -5 } },
    rotation: { type: 'vec3', default: { x: 0, y: 0, z: 0 } },
    src: { type: 'string', default: '/videos/sample.mp4' }
  },
  init: function () {
    this.setupVideo();
    this.video.addEventListener('loadedmetadata', () => {
      this.setupVideoPlane();
      this.setupPlayButton();
      this.addEventListeners();
    });
  },

  setupVideo: function () {
    // Create video element
    this.video = document.createElement('video');
    this.video.src = this.data.src;
    this.video.crossOrigin = 'anonymous';
    this.video.loop = true;
    this.video.setAttribute('playsinline', '');
    this.video.setAttribute('webkit-playsinline', '');
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
  },

  setupPlayButton: function () {
    // Create play button
    this.playButton = document.createElement('a-plane');
    
    // Calculate button position (centered at bottom of video)
    const buttonWidth = 1;
    const buttonHeight = 1;
    const buttonY = -(this.data.height / 2) - (buttonHeight / 2) - 0.5;
    
    this.playButton.setAttribute('width', buttonWidth);
    this.playButton.setAttribute('height', buttonHeight);
    this.playButton.setAttribute('position', `0 ${buttonY} 0.01`);
    this.playButton.setAttribute('material', 'color: white');
    this.playButton.setAttribute('class', 'clickable');
    
    // Add play icon
    this.updatePlayButton(false);
    
    this.videoPlane.appendChild(this.playButton);
  },

  addEventListeners: function () {
    // Add click listener to play button
    this.playButton.addEventListener('click', () => {
      if (this.video.paused) {
        this.video.play();
      } else {
        this.video.pause();
      }
      this.updatePlayButton(!this.video.paused);
    });

    // Update button state when video state changes
    this.video.addEventListener('play', () => this.updatePlayButton(true));
    this.video.addEventListener('pause', () => this.updatePlayButton(false));
  },

  updatePlayButton: function (isPlaying) {
    const color = isPlaying ? '#ff0000' : '#00ff00';
    const icon = isPlaying ? '⏸️' : '▶️';
    this.playButton.setAttribute('material', `color: ${color}`);
    
    // Update text
    if (!this.buttonText) {
      this.buttonText = document.createElement('a-text');
      this.buttonText.setAttribute('position', '0 0 0.01');
      this.buttonText.setAttribute('align', 'center');
      this.buttonText.setAttribute('color', 'black');
      this.buttonText.setAttribute('scale', '2 2 2');
      this.playButton.appendChild(this.buttonText);
    }
    this.buttonText.setAttribute('value', icon);
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
