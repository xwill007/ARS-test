AFRAME.registerComponent('vr-body', {
  schema: {
    // Propiedades básicas para el cuerpo
    height: { type: 'number', default: 1.5 },
    radius: { type: 'number', default: 0.3 },
    color: { type: 'color', default: '#4CC3D9' },
    // Propiedad para cambiar a un modelo 3D
    modelSrc: { type: 'string', default: '' },
    modelScale: { type: 'vec3', default: {x: 1, y: 1, z: 1} }
  },

  init: function () {
    this._createBody();
  },

  update: function (oldData) {
    // Si cambia el modelo o las propiedades básicas, recreamos el cuerpo
    if (oldData.modelSrc !== this.data.modelSrc || 
        oldData.height !== this.data.height || 
        oldData.radius !== this.data.radius || 
        oldData.color !== this.data.color) {
      this._removeBody();
      this._createBody();
    }
    
    // Si solo cambia la escala del modelo
    if (this.bodyEntity && this.data.modelSrc && 
        (oldData.modelScale.x !== this.data.modelScale.x ||
         oldData.modelScale.y !== this.data.modelScale.y ||
         oldData.modelScale.z !== this.data.modelScale.z)) {
      this.bodyEntity.setAttribute('scale', 
        `${this.data.modelScale.x} ${this.data.modelScale.y} ${this.data.modelScale.z}`);
    }
  },

  _createBody: function () {
    // Si hay un modelo 3D especificado, usarlo en lugar del cilindro
    if (this.data.modelSrc) {
      this.bodyEntity = document.createElement('a-entity');
      this.bodyEntity.setAttribute('gltf-model', this.data.modelSrc);
      this.bodyEntity.setAttribute('scale', 
        `${this.data.modelScale.x} ${this.data.modelScale.y} ${this.data.modelScale.z}`);
    } else {
      // Si no hay modelo, crear un cilindro básico
      this.bodyEntity = document.createElement('a-cylinder');
      this.bodyEntity.setAttribute('height', this.data.height);
      this.bodyEntity.setAttribute('radius', this.data.radius);
      this.bodyEntity.setAttribute('color', this.data.color);
      this.bodyEntity.setAttribute('position', '0 0 0');
      
      // Añadir una cabeza simple (una esfera)
      const head = document.createElement('a-sphere');
      head.setAttribute('radius', this.data.radius * 0.8);
      head.setAttribute('color', this.data.color);
      head.setAttribute('position', `0 ${this.data.height / 2 + this.data.radius * 0.8 * 0.8} 0`);
      this.bodyEntity.appendChild(head);
    }
    
    this.bodyEntity.classList.add('avatar-body');
    this.el.appendChild(this.bodyEntity);
  },

  _removeBody: function () {
    if (this.bodyEntity) {
      this.el.removeChild(this.bodyEntity);
      this.bodyEntity = null;
    }
  },

  remove: function () {
    this._removeBody();
  }
});
