/* global AFRAME */
AFRAME.registerComponent('video-controls', {
  schema: {
    width: { type: 'number', default: 4 },
    height: { type: 'number', default: 2.25 }
  },

  init: function() {
    this.isPlaying = false;
    this.createButton();
  },

  createButton: function() {
    // Controls container
    this.controlsContainer = document.createElement('a-entity');
    this.controlsContainer.setAttribute('position', `0 ${-this.data.height/2 - 0.4} 0.01`);

    // Play/Pause button
    this.button = document.createElement('a-entity');
    this.button.setAttribute('geometry', {
      primitive: 'plane',
      width: 1.2,  // Increased width
      height: 0.6  // Increased height
    });
    this.button.setAttribute('material', {
      color: '#4CAF50',
      opacity: 0.9,
      shader: 'flat'
    });
    this.button.classList.add('clickable');

    // Button background with rounded border
    const buttonBg = document.createElement('a-entity');
    buttonBg.setAttribute('geometry', {
      primitive: 'plane',
      width: 1.22,  // Increased width
      height: 0.62  // Increased height
    });
    buttonBg.setAttribute('material', {
      color: '#FFFFFF',
      opacity: 0.2,
      shader: 'flat'
    });
    buttonBg.setAttribute('position', '0 0 -0.001');
    this.button.appendChild(buttonBg);

    // Button icon
    this.buttonIcon = document.createElement('a-text');
    this.buttonIcon.setAttribute('value', '▶');
    this.buttonIcon.setAttribute('align', 'center');
    this.buttonIcon.setAttribute('position', '-0.35 0 0.01');  // Adjusted position
    this.buttonIcon.setAttribute('scale', '0.8 0.8 0.8');  // Increased scale
    this.buttonIcon.setAttribute('color', 'white');
    this.buttonIcon.setAttribute('font', 'exo2bold');  // Using a bolder font
    this.button.appendChild(this.buttonIcon);

    // Button text
    this.buttonText = document.createElement('a-text');
    this.buttonText.setAttribute('value', 'PLAY');
    this.buttonText.setAttribute('align', 'left');
    this.buttonText.setAttribute('position', '-0.15 0 0.01');  // Adjusted position
    this.buttonText.setAttribute('scale', '0.5 0.5 0.5');  // Increased scale
    this.buttonText.setAttribute('color', 'white');
    this.buttonText.setAttribute('font', 'exo2bold');  // Using a bolder font
    this.button.appendChild(this.buttonText);

    // Button events
    this.button.addEventListener('click', () => {
      this.isPlaying = !this.isPlaying;
      this.updateButtonState();
      this.el.emit(this.isPlaying ? 'video-play' : 'video-pause');
    });

    // Hover effects
    this.button.addEventListener('mouseenter', () => {
      this.button.setAttribute('material', 'opacity', 1);
      this.button.setAttribute('scale', '1.1 1.1 1');
      buttonBg.setAttribute('scale', '1.1 1.1 1');
      this.buttonText.setAttribute('color', '#FFFFFF');  // Brighter text on hover
      this.buttonIcon.setAttribute('color', '#FFFFFF');  // Brighter icon on hover
    });

    this.button.addEventListener('mouseleave', () => {
      this.button.setAttribute('material', 'opacity', 0.9);
      this.button.setAttribute('scale', '1 1 1');
      buttonBg.setAttribute('scale', '1 1 1');
      this.buttonText.setAttribute('color', 'white');
      this.buttonIcon.setAttribute('color', 'white');
    });

    this.button.addEventListener('raycaster-intersected', () => {
      this.button.setAttribute('material', 'opacity', 1);
      this.button.setAttribute('scale', '1.1 1.1 1');
      buttonBg.setAttribute('scale', '1.1 1.1 1');
      this.buttonText.setAttribute('color', '#FFFFFF');  // Brighter text on hover
      this.buttonIcon.setAttribute('color', '#FFFFFF');  // Brighter icon on hover
    });

    this.button.addEventListener('raycaster-intersected-cleared', () => {
      this.button.setAttribute('material', 'opacity', 0.9);
      this.button.setAttribute('scale', '1 1 1');
      buttonBg.setAttribute('scale', '1 1 1');
      this.buttonText.setAttribute('color', 'white');
      this.buttonIcon.setAttribute('color', 'white');
    });

    // Listen for video events
    this.el.addEventListener('video-started', () => {
      this.isPlaying = true;
      this.updateButtonState();
    });

    this.el.addEventListener('video-ended', () => {
      this.isPlaying = false;
      this.updateButtonState();
    });

    this.controlsContainer.appendChild(this.button);
    this.el.appendChild(this.controlsContainer);
  },

  updateButtonState: function() {
    if (this.isPlaying) {
      this.buttonIcon.setAttribute('value', '❚❚');
      this.buttonIcon.setAttribute('position', '-0.4 0 0.01');  // Adjusted position for pause icon
      this.buttonText.setAttribute('value', 'PAUSE');
      this.button.setAttribute('material', 'color', '#f44336');
    } else {
      this.buttonIcon.setAttribute('value', '▶');
      this.buttonIcon.setAttribute('position', '-0.35 0 0.01');  // Original position for play icon
      this.buttonText.setAttribute('value', 'PLAY');
      this.button.setAttribute('material', 'color', '#4CAF50');
    }
  }
});
