AFRAME.registerComponent('vr-move-controls', {
  schema: {
    // Velocidad de movimiento
    speed: { type: 'number', default: 0.1 },
    // Controles WASD habilitados
    enabled: { type: 'boolean', default: true },
    // ID de la cámara para seguir su dirección
    cameraSelector: { type: 'string', default: '' },
    // Habilitar rotación del cuerpo para que siga la dirección de la cámara
    rotateWithCamera: { type: 'boolean', default: true },
    // Suavizado de rotación
    rotationSmoothness: { type: 'number', default: 10 },
    // Habilitar restricción al suelo (mantiene la Y estable)
    floorRestricted: { type: 'boolean', default: true },
    // Velocidad de sprint (multiplicador cuando se pulsa Shift)
    sprintFactor: { type: 'number', default: 2.0 }
  },
  init: function () {
    // Variables para manejar el estado de las teclas
    this.keys = {};
    this.movement = new THREE.Vector3();
    this.errorCount = 0; // Contador para evitar spam de errores
    this.lastErrorTime = 0; // Timestamp del último error
    
    // Guardar referencia a la entidad y su objeto 3D
    this.el.sceneEl.renderer.sortObjects = true;
    this.mainObject = this.el.object3D;
    this.desiredRotation = new THREE.Quaternion();
    
    // Vincular métodos para los event listeners
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    
    // Añadir event listeners
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
      // Esperar un poco antes de buscar la cámara para asegurar que el DOM está listo
    setTimeout(() => {
      try {
        // Buscar la cámara (si no se proporciona, intentará encontrarla por sí mismo)
        this.findCamera();
        console.log('VRMoveControls inicializado');
      } catch (initError) {
        console.error('Error al inicializar VRMoveControls:', initError);
        // Intentar recuperación
        setTimeout(() => this.findCamera(), 500);
      }
    }, 100);
  },  findCamera: function() {
    try {
      // Validar que el selector de cámara sea válido
      if (this.data.cameraSelector && 
          this.data.cameraSelector !== '#undefined' && 
          this.data.cameraSelector !== '#') {
          
        try {
          // Si tenemos un selector, intentamos usarlo (asegurándose de que sea válido)
          const selector = this.data.cameraSelector;
          if (selector.includes('#')) {
            this.cameraEl = document.querySelector(selector);
            if (this.cameraEl) {
              console.log('VRMoveControls: Cámara encontrada por selector', selector);
              return;
            }
          } else {
            console.warn('VRMoveControls: Selector de cámara inválido:', selector);
          }
        } catch (e) {
          console.warn('VRMoveControls: Error al buscar cámara con selector:', e.message);
        }
        
        console.warn('VRMoveControls: Selector de cámara especificado, pero no se encontró ninguna cámara. Buscando alternativas...');
      }
      
      // Intentar encontrar la cámara dentro de la entidad actual (vr-user)
      const cameraEntity = this.el.querySelector('[camera]');
      if (cameraEntity) {
        this.cameraEl = cameraEntity;
        console.log('VRMoveControls: Cámara encontrada dentro del usuario');
        return;
      }
      
      // Si no, buscar cualquier cámara en la escena
      this.cameraEl = document.querySelector('a-entity[camera], a-camera');
      if (this.cameraEl) {
        console.log('VRMoveControls: Cámara encontrada en la escena');
        return;
      }
      
      // Si todavía no encontramos una cámara, esperamos a que la escena esté cargada y buscamos de nuevo
      const scene = this.el.sceneEl;
      if (!scene.hasLoaded) {
        scene.addEventListener('loaded', () => {
          this.cameraEl = document.querySelector('a-entity[camera], a-camera');
          console.log('VRMoveControls: Cámara encontrada después de cargar la escena');
        });
      }
      
      if (!this.cameraEl) {
        console.warn('VRMoveControls: No se encontró una cámara. Los movimientos no se orientarán correctamente.');
      }
    } catch (error) {
      console.error('VRMoveControls: Error al buscar la cámara:', error);
      // Intento de recuperación: buscar cualquier cámara en la escena
      this.cameraEl = document.querySelector('a-entity[camera], a-camera');
    }
  },

  update: function(oldData) {
    // Actualizar la cámara si cambió el selector
    if (oldData.cameraSelector !== this.data.cameraSelector) {
      this.findCamera();
    }
  },

  onKeyDown: function(event) {
    if (!this.data.enabled) return;
    
    // Actualizar el estado de las teclas
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = true;
        break;
    }
  },

  onKeyUp: function(event) {
    // Actualizar el estado de las teclas
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = false;
        break;
    }
  },  tick: function(time, deltaTime) {
    if (!this.data.enabled || !this.mainObject) return;
    
    try {
      // Si no tenemos cámara o si la cámara ya no es válida, intentar encontrarla de nuevo
      if (!this.cameraEl || !this.cameraEl.isConnected || !this.cameraEl.object3D) {
        this.findCamera();
        if (!this.cameraEl) {
          // No encontramos cámara, pero no lanzamos error para evitar spam en la consola
          return;
        }
      }

      // Calcular el delta de tiempo normalizado (para hacer el movimiento independiente de la velocidad de cuadros)
      let dt = deltaTime / 1000;
      if (isNaN(dt) || dt > 1) {
        dt = 1/60; // Valor por defecto si el delta es inválido
      }

      // Calcular velocidad actual (incluyendo sprint)
      const speed = this.keys.sprint ? 
                    this.data.speed * this.data.sprintFactor : 
                    this.data.speed;      // Reiniciar vector de movimiento
      this.movement.set(0, 0, 0);

      // Aplicar movimiento según las teclas presionadas (usando el sistema de coordenadas estándar)
      if (this.keys.forward) this.movement.z += speed;
      if (this.keys.backward) this.movement.z -= speed;
      if (this.keys.left) this.movement.x += speed;
      if (this.keys.right) this.movement.x -= speed;

      // Solo procesar el movimiento si hay teclas presionadas y tenemos una cámara válida
      if (this.movement.length() > 0) {
        if (!this.cameraEl || !this.cameraEl.object3D) {
          // No mostramos error, simplemente salimos para evitar errores
          return;
        }        // Obtener la dirección de la cámara
        const camera3D = this.cameraEl.object3D;
          // En A-Frame/Three.js, el eje Z negativo (-Z) es "adelante"
        // IMPORTANTE: Usamos (0,0,1) para invertir la dirección y que al presionar W nos movamos
        // en la dirección en la que está mirando la cámara
        const cameraDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(camera3D.quaternion);
        
        // Extraer solo la componente XZ para mantener el movimiento horizontal
        const cameraDirectionXZ = new THREE.Vector3(cameraDirection.x, 0, cameraDirection.z).normalize();
        
        // Debug para ver la dirección (descomentar si necesitas depurar)
        if (time % 1000 < 20) {  // Solo mostrar cada segundo aproximadamente
          // console.log('Dirección cámara XZ:', cameraDirectionXZ.x.toFixed(2), cameraDirectionXZ.z.toFixed(2));
        }
        
        // Crear una matriz de rotación desde el vector de dirección de la cámara
        const rotationMatrix = new THREE.Matrix4().lookAt(
          new THREE.Vector3(),
          cameraDirectionXZ,
          new THREE.Vector3(0, 1, 0)
        );

        // Aplicar la rotación al vector de movimiento
        this.movement.applyMatrix4(rotationMatrix);        // Si debemos rotar el cuerpo con la cámara, calculamos la rotación deseada
        if (this.data.rotateWithCamera && 
            (this.keys.forward || this.keys.backward || this.keys.left || this.keys.right)) {
          
          try {
            // Calcular la rotación basada en la dirección de movimiento
            // Creamos una copia del vector de movimiento para no afectar el movimiento original
            const movementDirection = new THREE.Vector3().copy(this.movement).normalize();
            // Verificar que la dirección de movimiento no sea un vector cero
            if (movementDirection.lengthSq() > 0.00001) {
              // Creamos una matriz de rotación mirando en la dirección del movimiento
              const targetRotation = new THREE.Matrix4().lookAt(
                new THREE.Vector3(),
                movementDirection,
                new THREE.Vector3(0, 1, 0)
              );
              
              this.desiredRotation.setFromRotationMatrix(targetRotation);
              
              // Aplicar suavizado a la rotación
              if (this.data.rotationSmoothness > 0) {
                // En THREE.js 0.147.0 (usado por A-Frame 1.4.0), slerp ya no es un método estático
                // sino un método de instancia
                const resultQuat = this.mainObject.quaternion.clone();
                resultQuat.slerp(this.desiredRotation, Math.min(dt * this.data.rotationSmoothness, 1.0));
                this.mainObject.quaternion.copy(resultQuat);
              } else {
                this.mainObject.quaternion.copy(this.desiredRotation);
              }
            }
          } catch (rotationError) {
            console.warn('VRMoveControls: Error al calcular rotación:', rotationError.message);
          }
        }
      }
        // Aplicar el movimiento a la posición de forma segura
      if (this.mainObject) {
        this.mainObject.position.add(this.movement);
      }
      
      // Restricción al suelo si está habilitado
      if (this.data.floorRestricted) {
        try {
          const currentPosition = this.el.getAttribute('position');
          if (currentPosition && currentPosition.y !== 1) {
            this.el.setAttribute('position', {
              x: currentPosition.x,
              y: 1, // Mantener a 1 unidad del suelo
              z: currentPosition.z
            });
          }
        } catch (e) {
          console.warn('VRMoveControls: Error al ajustar posición al suelo:', e.message);
        }
      }    
    } catch (error) {
      // Evitar spam de errores por cámara no disponible
      if (!error.message || !error.message.includes('Cámara no disponible')) {
        console.warn('VRMoveControls: Error en tick:', error.message || error);
      }
      
      // Reintentar encontrar la cámara para el próximo frame
      this.cameraEl = null;
      this.findCamera();
    }
  },

  remove: function() {
    // Eliminar event listeners
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    
    // Limpiar referencias
    this.keys = {};
    this.cameraEl = null;
  }
});
