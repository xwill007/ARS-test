/* global AFRAME */
AFRAME.registerComponent('vr-youtube-simple', {
  schema: {
    width: { type: 'number', default: 4 },
    height: { type: 'number', default: 2.25 },
    videoId: { type: 'string', default: 'M7lc1UVf-VE' },
    autoplay: { type: 'boolean', default: false }
  },

  init: function() {
    // Inicializar el componente base
    this.el.setAttribute('vr-youtube-base', this.data);

    // Crear iframe container
    this.container = document.createElement('div');
    this.container.id = `youtube-simple-${Math.random().toString(36).substr(2, 9)}`;
    this.container.style.position = 'fixed';
    this.container.style.left = '-9999px';
    document.body.appendChild(this.container);

    // Crear iframe
    this.iframe = document.createElement('iframe');
    this.iframe.width = "854";
    this.iframe.height = "480";
    this.iframe.src = `https://www.youtube-nocookie.com/embed/${this.data.videoId}?enablejsapi=1&autoplay=${this.data.autoplay ? '1' : '0'}&controls=0&origin=${window.location.origin}`;
    this.iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    this.container.appendChild(this.iframe);

    // Aplicar textura al plano
    const videoPlane = this.el.querySelector('[geometry]');
    if (videoPlane) {
      const material = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide
      });

      // Crear textura desde iframe
      const texture = new THREE.Texture(this.iframe);
      texture.minFilter = THREE.LinearFilter;
      material.map = texture;

      const mesh = videoPlane.getObject3D('mesh');
      if (mesh) {
        mesh.material = material;
      }

      // Actualizar textura continuamente
      const animate = () => {
        if (this.iframe) {
          texture.needsUpdate = true;
          requestAnimationFrame(animate);
        }
      };
      animate();
    }

    // Conectar eventos de control
    this.el.addEventListener('video-play', () => {
      this.iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
    });

    this.el.addEventListener('video-pause', () => {
      this.iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    });
  },

  remove: function() {
    if (this.container) {
      this.container.remove();
    }
  }
});
