AFRAME.registerComponent('vr-sky', {
  schema: {
    color: { type: 'color', default: 'black' },
    src: { type: 'string', default: '' },
    radius: { type: 'number', default: 5000 }
  },

  init: function () {
    // Crear el elemento sky
    const sky = document.createElement('a-sky');
    
    // Configurar atributos básicos
    sky.setAttribute('color', this.data.color);
    sky.setAttribute('radius', this.data.radius);
    
    // Si hay una textura, aplicarla
    if (this.data.src) {
      sky.setAttribute('src', this.data.src);
    }

    // Añadir el cielo como hijo del elemento
    this.el.appendChild(sky);
  },

  update: function (oldData) {
    // Obtener el elemento sky
    const sky = this.el.querySelector('a-sky');
    if (!sky) return;

    // Actualizar color si ha cambiado
    if (oldData.color !== this.data.color) {
      sky.setAttribute('color', this.data.color);
    }

    // Actualizar textura si ha cambiado
    if (oldData.src !== this.data.src) {
      if (this.data.src) {
        sky.setAttribute('src', this.data.src);
      } else {
        sky.removeAttribute('src');
      }
    }

    // Actualizar radio si ha cambiado
    if (oldData.radius !== this.data.radius) {
      sky.setAttribute('radius', this.data.radius);
    }
  }
});
