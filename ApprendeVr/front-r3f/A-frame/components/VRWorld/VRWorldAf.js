// Importar los componentes necesarios para VRWorld
import '../VRWorld/VRFloorAf.js';
import '../VRWorld/VRSkyAf.js';

AFRAME.registerComponent('vr-world', {
  schema: {
    // Propiedades del cielo (VRSky)
    skyColor: { type: 'color', default: 'black' },
    skySrc: { type: 'string', default: '' },
    skyRadius: { type: 'number', default: 5000 },
    
    // Propiedades del piso (VRFloor)
    floorWidth: { type: 'number', default: 100 },
    floorHeight: { type: 'number', default: 100 },
    floorTextureRepeatX: { type: 'number', default: 50 },
    floorTextureRepeatY: { type: 'number', default: 50 },
    floorRoughness: { type: 'number', default: 0.8 },
    floorMetalness: { type: 'number', default: 0.2 },
    floorSrc: { type: 'string', default: '/images/piso_ajedrez.jpg' }
  },

  init: function () {
    this._createWorld();
  },

  update: function (oldData) {
    // Si cambia cualquier propiedad, recreamos el mundo
    // En una implementación más avanzada, podríamos actualizar solo las propiedades que han cambiado
    this._removeWorld();
    this._createWorld();
  },

  _createWorld: function () {
    // Crear el cielo
    const sky = document.createElement('a-entity');
    sky.setAttribute('vr-sky', {
      color: this.data.skyColor,
      src: this.data.skySrc,
      radius: this.data.skyRadius
    });
    this.sky = sky;
    this.el.appendChild(sky);

    // Crear el piso
    const floor = document.createElement('a-entity');
    floor.setAttribute('vr-floor', {
      width: this.data.floorWidth,
      height: this.data.floorHeight,
      textureRepeatX: this.data.floorTextureRepeatX,
      textureRepeatY: this.data.floorTextureRepeatY,
      roughness: this.data.floorRoughness,
      metalness: this.data.floorMetalness,
      src: this.data.floorSrc
    });
    this.floor = floor;
    this.el.appendChild(floor);
  },

  _removeWorld: function () {
    // Eliminar componentes anteriores si existen
    if (this.sky) {
      this.el.removeChild(this.sky);
      this.sky = null;
    }
    if (this.floor) {
      this.el.removeChild(this.floor);
      this.floor = null;
    }
  },

  remove: function () {
    this._removeWorld();
  }
});
