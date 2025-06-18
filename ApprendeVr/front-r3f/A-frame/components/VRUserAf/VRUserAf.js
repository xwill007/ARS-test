// Importar componentes necesarios para VRUser
import './VRBodyAf.js';
import './VRCameraAf.js';
import './VRMoveControlsAf.js';

AFRAME.registerComponent('vr-user', {
  schema: {    position: { type: 'vec3', default: {x: 0, y: 1.6, z: 0} },
    // Propiedades para la cámara
    cameraHeight: { type: 'number', default: 1.6 },
    cameraMode: { type: 'string', default: 'first-person', oneOf: ['first-person', 'third-person'] },
    thirdPersonDistance: { type: 'number', default: 2 },
    thirdPersonHeight: { type: 'number', default: 1 },
    thirdPersonAngle: { type: 'number', default: 0 },
    enableWASD: { type: 'boolean', default: true },
    enableLook: { type: 'boolean', default: true },
    reverseMouseDrag: { type: 'boolean', default: false },
    pointerLockEnabled: { type: 'boolean', default: true },
    // Propiedades para los controles de movimiento
    moveSpeed: { type: 'number', default: 0.1 },
    moveEnabled: { type: 'boolean', default: true },
    rotateWithCamera: { type: 'boolean', default: true },
    rotationSmoothness: { type: 'number', default: 10 },
    floorRestricted: { type: 'boolean', default: true },
    sprintFactor: { type: 'number', default: 2.0 },// Propiedades para el cuerpo del avatar
    bodyHeight: { type: 'number', default: 1.5 },
    bodyRadius: { type: 'number', default: 0.3 },
    bodyColor: { type: 'color', default: '#4CC3D9' },
    bodyModel: { type: 'string', default: '' },
    bodyModelScale: { type: 'vec3', default: {x: 1, y: 1, z: 1} },
    showBody: { type: 'boolean', default: true },
    showBodyInFirstPerson: { type: 'boolean', default: true }
  },

  init: function () {    // Configurar la posición del usuario
    this.el.setAttribute('position', this.data.position);
    
    // Agregar la cámara como componente hijo
    const cameraRig = document.createElement('a-entity');
    cameraRig.setAttribute('vr-camera', {
      mode: this.data.cameraMode,
      height: this.data.cameraHeight,
      thirdPersonDistance: this.data.thirdPersonDistance,
      thirdPersonHeight: this.data.thirdPersonHeight,
      thirdPersonAngle: this.data.thirdPersonAngle,
      lookControls: this.data.enableLook,
      wasdControls: false, // Desactivar los controles WASD nativos de la cámara para usar nuestro vr-move-controls
      reverseMouseDrag: this.data.reverseMouseDrag,
      pointerLockEnabled: this.data.pointerLockEnabled
    });
      this.cameraEntity = cameraRig;
    this.el.appendChild(cameraRig);    
    // Asignar un ID a la cámara si no tiene uno o si está vacío
    const cameraId = 'user-camera-rig-' + Math.floor(Math.random() * 10000);
    cameraRig.id = cameraId;
    console.log('VRUserAf: ID de cámara asignado:', cameraRig.id);
    
    // Añadir los controles de movimiento personalizados - Asegurar que el selector es válido
    const cameraSelector = '#' + cameraId;
    console.log('VRUserAf: Configurando controles de movimiento con selector:', cameraSelector);
    
    // Esperar a que termine el frame actual para asegurar que el ID ya está en el DOM
    setTimeout(() => {
      this.el.setAttribute('vr-move-controls', {
        speed: this.data.moveSpeed,
        enabled: this.data.moveEnabled && this.data.enableWASD, // Respetar la opción enableWASD
        cameraSelector: cameraSelector,
        rotateWithCamera: this.data.rotateWithCamera,
        rotationSmoothness: this.data.rotationSmoothness,
        floorRestricted: this.data.floorRestricted,
        sprintFactor: this.data.sprintFactor
      });
      console.log('VRUserAf: Controles de movimiento configurados');
    }, 0);
    this.moveControlsAdded = true;
    
    // Agregar el cuerpo del avatar si está habilitado
    if (this.data.showBody) {
      const body = document.createElement('a-entity');
      // El cuerpo se posiciona para que sus pies estén en el suelo (y=0)
      body.setAttribute('position', `0 ${this.data.bodyHeight/2} 0`);
      body.setAttribute('vr-body', {
        height: this.data.bodyHeight,
        radius: this.data.bodyRadius,
        color: this.data.bodyColor,
        modelSrc: this.data.bodyModel,
        modelScale: this.data.bodyModelScale
      });
      this.el.appendChild(body);
      this.bodyEntity = body;
      
      // Aplicar la visibilidad inicial según el modo de cámara
      this._updateBodyVisibility();
    }
  },

  update: function (oldData) {
    // Actualizar la posición del usuario si cambió
    if (oldData.position !== this.data.position) {
      this.el.setAttribute('position', this.data.position);
    }    // Actualizar la configuración de la cámara si cambió algún parámetro relevante
    if (this.cameraEntity &&
        (oldData.cameraMode !== this.data.cameraMode ||
         oldData.cameraHeight !== this.data.cameraHeight ||
         oldData.thirdPersonDistance !== this.data.thirdPersonDistance ||
         oldData.thirdPersonHeight !== this.data.thirdPersonHeight ||
         oldData.thirdPersonAngle !== this.data.thirdPersonAngle ||
         oldData.enableLook !== this.data.enableLook ||
         oldData.reverseMouseDrag !== this.data.reverseMouseDrag ||
         oldData.pointerLockEnabled !== this.data.pointerLockEnabled)) {
      
      this.cameraEntity.setAttribute('vr-camera', {
        mode: this.data.cameraMode,
        height: this.data.cameraHeight,
        thirdPersonDistance: this.data.thirdPersonDistance,
        thirdPersonHeight: this.data.thirdPersonHeight,
        thirdPersonAngle: this.data.thirdPersonAngle,
        lookControls: this.data.enableLook,
        wasdControls: false, // Siempre false para usar nuestros propios controles
        reverseMouseDrag: this.data.reverseMouseDrag,
        pointerLockEnabled: this.data.pointerLockEnabled
      });
      
      // Si cambió el modo de cámara, actualizar la visibilidad del cuerpo
      if (oldData.cameraMode !== this.data.cameraMode) {
        this._updateBodyVisibility();
      }
    }
    
    // Actualizar los controles de movimiento si cambiaron los parámetros relevantes
    if (this.moveControlsAdded &&
        (oldData.moveSpeed !== this.data.moveSpeed ||
         oldData.moveEnabled !== this.data.moveEnabled ||
         oldData.enableWASD !== this.data.enableWASD ||
         oldData.rotateWithCamera !== this.data.rotateWithCamera ||
         oldData.rotationSmoothness !== this.data.rotationSmoothness ||
         oldData.floorRestricted !== this.data.floorRestricted ||
         oldData.sprintFactor !== this.data.sprintFactor)) {
      
      this.el.setAttribute('vr-move-controls', {
        speed: this.data.moveSpeed,
        enabled: this.data.moveEnabled && this.data.enableWASD,
        rotateWithCamera: this.data.rotateWithCamera,
        rotationSmoothness: this.data.rotationSmoothness,
        floorRestricted: this.data.floorRestricted,
        sprintFactor: this.data.sprintFactor
      });
    }
    
    // Actualizar visibilidad del cuerpo si cambió la configuración de mostrar en primera persona
    if (this.bodyEntity && oldData.showBodyInFirstPerson !== this.data.showBodyInFirstPerson) {
      this._updateBodyVisibility();
    }
    
    // Manejar cambios en el cuerpo del avatar
    if (this.bodyEntity) {
      // Actualizar posición del cuerpo si cambió la altura
      if (oldData.bodyHeight !== this.data.bodyHeight) {
        this.bodyEntity.setAttribute('position', `0 ${this.data.bodyHeight/2} 0`);
      }
      
      // Actualizar propiedades del componente vr-body
      if (oldData.bodyHeight !== this.data.bodyHeight ||
          oldData.bodyRadius !== this.data.bodyRadius ||
          oldData.bodyColor !== this.data.bodyColor ||
          oldData.bodyModel !== this.data.bodyModel ||
          oldData.bodyModelScale.x !== this.data.bodyModelScale.x ||
          oldData.bodyModelScale.y !== this.data.bodyModelScale.y ||
          oldData.bodyModelScale.z !== this.data.bodyModelScale.z) {
        
        this.bodyEntity.setAttribute('vr-body', {
          height: this.data.bodyHeight,
          radius: this.data.bodyRadius,
          color: this.data.bodyColor,
          modelSrc: this.data.bodyModel,
          modelScale: this.data.bodyModelScale
        });
      }
    }
    
    // Manejar la visualización/ocultamiento del cuerpo
    if (oldData.showBody !== this.data.showBody) {      if (this.data.showBody && !this.bodyEntity) {
        // Crear el cuerpo si no existía y ahora debe mostrarse
        const body = document.createElement('a-entity');
        body.setAttribute('position', `0 ${this.data.bodyHeight/2} 0`);
        body.setAttribute('vr-body', {
          height: this.data.bodyHeight,
          radius: this.data.bodyRadius,
          color: this.data.bodyColor,
          modelSrc: this.data.bodyModel,
          modelScale: this.data.bodyModelScale
        });
        this.el.appendChild(body);
        this.bodyEntity = body;
      } else if (!this.data.showBody && this.bodyEntity) {
        // Eliminar el cuerpo si existía y ahora no debe mostrarse
        this.el.removeChild(this.bodyEntity);
        this.bodyEntity = null;
      }
    }

    // Actualizar la visibilidad del cuerpo según el modo de cámara
    this._updateBodyVisibility();
  },
  
  remove: function () {
    // Limpiar cuando se elimine el componente
    if (this.bodyEntity) {
      this.el.removeChild(this.bodyEntity);
      this.bodyEntity = null;
    }
  },

  // Métodos para controlar la cámara
  toggleCameraMode: function () {
    if (this.cameraEntity) {
      const currentMode = this.data.cameraMode;
      const newMode = currentMode === 'first-person' ? 'third-person' : 'first-person';
      this.el.setAttribute('vr-user', 'cameraMode', newMode);
    }
  },

  orbitCamera: function (deltaAngle) {
    if (this.cameraEntity && this.data.cameraMode === 'third-person') {
      const newAngle = (this.data.thirdPersonAngle + deltaAngle) % 360;
      this.el.setAttribute('vr-user', 'thirdPersonAngle', newAngle);
    }
  },

  zoomCamera: function (deltaDistance) {
    if (this.cameraEntity && this.data.cameraMode === 'third-person') {
      const newDistance = Math.max(0.5, this.data.thirdPersonDistance + deltaDistance);
      this.el.setAttribute('vr-user', 'thirdPersonDistance', newDistance);
    }
  },

  // Método para actualizar la visibilidad del cuerpo en función del modo de cámara
  _updateBodyVisibility: function() {
    if (!this.bodyEntity) return;
    
    // En modo primera persona, la visibilidad depende de showBodyInFirstPerson
    if (this.data.cameraMode === 'first-person') {
      this.bodyEntity.setAttribute('visible', this.data.showBodyInFirstPerson);
    } else {
      // En modo tercera persona, siempre mostramos el cuerpo
      this.bodyEntity.setAttribute('visible', true);
    }
  },

  // Método para alternar la visibilidad del cuerpo en primera persona
  toggleBodyInFirstPerson: function() {
    const newValue = !this.data.showBodyInFirstPerson;
    this.el.setAttribute('vr-user', 'showBodyInFirstPerson', newValue);
    console.log(`Cuerpo en primera persona: ${newValue ? 'visible' : 'oculto'}`);
  },
});
