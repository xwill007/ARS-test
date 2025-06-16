AFRAME.registerComponent('vr-camera', {
  schema: {
    height: { type: 'number', default: 1.6 },
    lookControls: { type: 'boolean', default: true },
    wasdControls: { type: 'boolean', default: true }
  },

  init: function () {
    // Crear la cámara
    const camera = document.createElement('a-camera');
    
    // Configurar los controles
    if (this.data.lookControls) {
      camera.setAttribute('look-controls', '');
    }
    if (this.data.wasdControls) {
      camera.setAttribute('wasd-controls', '');
    }

    // Agregar cursor para interacción en VR
    const cursor = document.createElement('a-entity');
    cursor.setAttribute('cursor', {
      rayOrigin: 'mouse',
      fuse: false
    });
    cursor.setAttribute('position', '0 0 -1');
    cursor.setAttribute('geometry', {
      primitive: 'ring',
      radiusInner: 0.02,
      radiusOuter: 0.03
    });
    cursor.setAttribute('material', {
      color: '#FFFFFF',
      shader: 'flat',
      opacity: 0.8
    });
    
    camera.appendChild(cursor);
    this.el.appendChild(camera);
  }
});

AFRAME.registerComponent('vr-user', {
  schema: {
    position: { type: 'vec3', default: {x: 0, y: 1.6, z: 0} },
    cameraHeight: { type: 'number', default: 1.6 },
    enableWASD: { type: 'boolean', default: true },
    enableLook: { type: 'boolean', default: true }
  },

  init: function () {
    // Configurar la posición del usuario
    this.el.setAttribute('position', this.data.position);
    
    // Agregar la cámara como componente hijo
    const cameraRig = document.createElement('a-entity');
    cameraRig.setAttribute('vr-camera', {
      height: this.data.cameraHeight,
      lookControls: this.data.enableLook,
      wasdControls: this.data.enableWASD
    });
    
    this.el.appendChild(cameraRig);
  }
});
