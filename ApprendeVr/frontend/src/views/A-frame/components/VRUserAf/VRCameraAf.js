AFRAME.registerComponent('vr-camera', {
  schema: {
    // Configuración de la cámara
    mode: { type: 'string', default: 'first-person', oneOf: ['first-person', 'third-person'] },
    height: { type: 'number', default: 1.6 }, // Altura de los ojos en metros
    thirdPersonDistance: { type: 'number', default: 2 }, // Distancia de la cámara en tercera persona
    thirdPersonHeight: { type: 'number', default: 1 }, // Altura adicional en tercera persona
    thirdPersonAngle: { type: 'number', default: 0 }, // Ángulo de rotación en tercera persona (grados)
    lookControls: { type: 'boolean', default: true },
    wasdControls: { type: 'boolean', default: true },
    reverseMouseDrag: { type: 'boolean', default: false },
    pointerLockEnabled: { type: 'boolean', default: true }
  },

  init: function () {
    // Crear la entidad de la cámara
    this.cameraEntity = document.createElement('a-entity');
    this.cameraEntity.setAttribute('camera', '');
    if (this.data.lookControls) {
      this.cameraEntity.setAttribute('look-controls', {
        reverseMouseDrag: this.data.reverseMouseDrag,
        pointerLockEnabled: this.data.pointerLockEnabled
      });
    }
    if (this.data.wasdControls) {
      this.cameraEntity.setAttribute('wasd-controls', '');
    }

    // Crear cursor para interacción
    this.setupCursor();

    // Posicionar la cámara según el modo
    this.updateCameraPosition();
    
    // Añadir la cámara a la entidad
    this.el.appendChild(this.cameraEntity);
  },

  update: function (oldData) {
    // Si cambia el modo de la cámara o parámetros relacionados, actualizar la posición
    if (oldData.mode !== this.data.mode || 
        oldData.height !== this.data.height ||
        oldData.thirdPersonDistance !== this.data.thirdPersonDistance ||
        oldData.thirdPersonHeight !== this.data.thirdPersonHeight ||
        oldData.thirdPersonAngle !== this.data.thirdPersonAngle) {
      this.updateCameraPosition();
    }

    // Actualizar los controles si cambiaron
    if (oldData.lookControls !== this.data.lookControls) {
      if (this.data.lookControls) {
        this.cameraEntity.setAttribute('look-controls', {
          reverseMouseDrag: this.data.reverseMouseDrag,
          pointerLockEnabled: this.data.pointerLockEnabled
        });
      } else {
        this.cameraEntity.removeAttribute('look-controls');
      }
    }

    // Actualizar parámetros de look-controls si cambiaron
    if (this.data.lookControls && (
        oldData.reverseMouseDrag !== this.data.reverseMouseDrag ||
        oldData.pointerLockEnabled !== this.data.pointerLockEnabled)) {
      this.cameraEntity.setAttribute('look-controls', {
        reverseMouseDrag: this.data.reverseMouseDrag,
        pointerLockEnabled: this.data.pointerLockEnabled
      });
    }

    // Actualizar controles WASD si cambiaron
    if (oldData.wasdControls !== this.data.wasdControls) {
      if (this.data.wasdControls) {
        this.cameraEntity.setAttribute('wasd-controls', '');
      } else {
        this.cameraEntity.removeAttribute('wasd-controls');
      }
    }
  },

  setupCursor: function () {
    // Agregar cursor para interacción en VR
    const cursor = document.createElement('a-entity');
    cursor.setAttribute('id', 'cursor');
    cursor.setAttribute('cursor', {
      rayOrigin: 'mouse',
      fuse: false
    });
    cursor.setAttribute('raycaster', {
      objects: '.clickable',
      far: 30
    });
    cursor.setAttribute('position', '0 0 -1');
    cursor.setAttribute('geometry', {
      primitive: 'ring',
      radiusInner: 0.01,
      radiusOuter: 0.02
    });
    cursor.setAttribute('material', {
      color: 'white',
      shader: 'flat'
    });
    cursor.setAttribute('animation__click', {
      property: 'scale',
      startEvents: 'click',
      easing: 'easeInCubic',
      dur: 150,
      from: '0.1 0.1 0.1',
      to: '1 1 1'
    });
    
    this.cameraEntity.appendChild(cursor);
  },

  updateCameraPosition: function () {
    if (this.data.mode === 'first-person') {
      // En primera persona, la cámara está a la altura de los ojos
      this.cameraEntity.setAttribute('position', `0 ${this.data.height} 0`);
      this.cameraEntity.setAttribute('rotation', '0 0 0');
    } else if (this.data.mode === 'third-person') {
      // En tercera persona, la cámara está detrás y por encima del avatar
      const angle = THREE.MathUtils.degToRad(this.data.thirdPersonAngle);
      const x = -Math.sin(angle) * this.data.thirdPersonDistance;
      const z = -Math.cos(angle) * this.data.thirdPersonDistance;
      const y = this.data.height + this.data.thirdPersonHeight;
      
      this.cameraEntity.setAttribute('position', `${x} ${y} ${z}`);
      this.cameraEntity.setAttribute('rotation', `${this.data.thirdPersonHeight * 15} ${this.data.thirdPersonAngle} 0`);
    }
  },

  toggleCameraMode: function () {
    // Cambiar entre modos de cámara
    const newMode = this.data.mode === 'first-person' ? 'third-person' : 'first-person';
    this.el.setAttribute('vr-camera', 'mode', newMode);
  },

  // Método para uso externo que permite cambiar el ángulo de la cámara en tercera persona
  orbitCamera: function (deltaAngle) {
    if (this.data.mode === 'third-person') {
      const newAngle = (this.data.thirdPersonAngle + deltaAngle) % 360;
      this.el.setAttribute('vr-camera', 'thirdPersonAngle', newAngle);
    }
  },

  // Método para uso externo que permite acercar/alejar la cámara en tercera persona
  zoomCamera: function (deltaDistance) {
    if (this.data.mode === 'third-person') {
      const newDistance = Math.max(0.5, this.data.thirdPersonDistance + deltaDistance);
      this.el.setAttribute('vr-camera', 'thirdPersonDistance', newDistance);
    }
  },

  remove: function () {
    if (this.cameraEntity) {
      this.el.removeChild(this.cameraEntity);
      this.cameraEntity = null;
    }
  }
});
