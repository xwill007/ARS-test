/* global AFRAME */
AFRAME.registerComponent('vr-youtube-base', {
  schema: {
    width: { type: 'number', default: 4 },
    height: { type: 'number', default: 2.25 },
    videoId: { type: 'string', default: 'M7lc1UVf-VE' },
    autoplay: { type: 'boolean', default: false }
  },

  init: function() {
    // Añadir componente de controles de video
    this.el.setAttribute('video-controls', {
      width: this.data.width,
      height: this.data.height
    });

    // Configurar listeners para eventos de control
    this.el.addEventListener('video-play', this.onPlay.bind(this));
    this.el.addEventListener('video-pause', this.onPause.bind(this));
    
    // Crear el plano para el video
    this.videoPlane = document.createElement('a-entity');
    this.videoPlane.setAttribute('geometry', {
      primitive: 'plane',
      width: this.data.width,
      height: this.data.height
    });
    this.videoPlane.setAttribute('material', {
      shader: 'flat',
      side: 'double',
      color: '#000000'
    });
    this.el.appendChild(this.videoPlane);
  },

  onPlay: function() {
    // Implementar en componentes hijos
    console.log('Play requested');
  },

  onPause: function() {
    // Implementar en componentes hijos
    console.log('Pause requested');
  }
});
