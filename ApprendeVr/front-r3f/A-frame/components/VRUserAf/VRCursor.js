/**
 * VRCursor - Componente para manejar diferentes modos de interacción en A-Frame
 * Compatible con diversos métodos de selección: ratón, fuse (tiempo de espera), teclado, voz, etc.
 * En modo VR, auto-clic después de 3 segundos solo en elementos con clase 'clickable'
 */

AFRAME.registerComponent('vr-cursor', {
  schema: {
    // Apariencia del cursor
    color: { type: 'color', default: 'white' },
    hoverColor: { type: 'color', default: '#4CC3D9' },
    activeColor: { type: 'color', default: '#EF2D5E' },
    
    // Geometría del cursor
    primitive: { type: 'string', default: 'ring' },
    radiusInner: { type: 'number', default: 0.01 },
    radiusOuter: { type: 'number', default: 0.02 },
    
    // Raycasting
    rayOrigin: { type: 'string', default: 'mouse', oneOf: ['mouse', 'entity'] },
    far: { type: 'number', default: 30 },
    objects: { type: 'string', default: '.clickable' },
    
    // Modo de interacción
    mode: { type: 'string', default: 'mouse', oneOf: ['mouse', 'fuse', 'key', 'voice', 'gaze', 'auto'] },
    
    // Configuración para modo "fuse" (espera automática)
    fuseTimeout: { type: 'number', default: 3000 },
    
    // Configuración para ajuste automático en modo VR
    autoSwitchToFuseInVR: { type: 'boolean', default: false },
    
    // Configuración para limitar auto-clic a elementos con clase específica
    autoClickClass: { type: 'string', default: '.clickable' },
    excludeVideoPlane: { type: 'boolean', default: true },
    
    // Configuración para modo "key"
    keyCode: { type: 'number', default: 32 }, // 32 = espacio
    
    // Animaciones
    enableAnimations: { type: 'boolean', default: true },
    
    // Activar/desactivar logs
    showLogs: { type: 'boolean', default: true }
  },
  
  // Función para configurar la apariencia del cursor
  // IMPORTANTE: Definida antes de init para evitar errores
  setCursorAppearance: function() {
    try {
      // Verificar y asegurar valores válidos para la geometría
      const radiusInner = isNaN(this.data.radiusInner) || this.data.radiusInner <= 0 
        ? 0.01 : Math.max(0.001, this.data.radiusInner);
      
      const radiusOuter = isNaN(this.data.radiusOuter) || this.data.radiusOuter <= radiusInner 
        ? radiusInner + 0.01 : Math.max(radiusInner + 0.001, this.data.radiusOuter);
      
      // Geometría base con valores seguros
      this.el.setAttribute('geometry', {
        primitive: this.data.primitive || 'ring',
        radiusInner: radiusInner,
        radiusOuter: radiusOuter
      });
      
      // Material
      this.el.setAttribute('material', {
        color: this.data.color || 'white',
        shader: 'flat',
        opacity: 0.9
      });
      
      console.log('[VRCursor] Apariencia del cursor configurada con radios:', 
        { inner: radiusInner, outer: radiusOuter });
    } catch (error) {
      console.error('[VRCursor] Error al configurar apariencia del cursor:', error);
      
      // Configuración de respaldo por si hay error
      this.el.setAttribute('geometry', {
        primitive: 'ring',
        radiusInner: 0.01,
        radiusOuter: 0.02
      });
      
      this.el.setAttribute('material', {
        color: 'white',
        shader: 'flat',
        opacity: 0.9
      });
    }
  },
  
  init: function() {
    // Mostrar mensaje inicial con la configuración
    console.log('[VRCursor] Inicializando cursor con configuración:', 
      'modo:', this.data.mode, 
      'fuseTimeout:', this.data.fuseTimeout,
      'objects:', this.data.objects);
    
    // Referencia al elemento
    this.el.classList.add('cursor-controller');
    this.el.setAttribute('id', 'vr-cursor-entity');
    
    // Estado
    this.intersectedEl = null;
    this.isFusing = false;
    this.isMouseDown = false;    
    this.isInVRMode = false;
    this.originalMode = this.data.mode; // Guardar modo original
    this.fuseTimeoutId = null; // Variable para el temporizador
    
    // Detectar cuando el usuario entra/sale del modo VR
    this.bindVRModeChangeHandler();
    
    // Configurar cursor
    this.setCursorAppearance();
    
    // Configurar raycaster
    this.el.setAttribute('raycaster', {
      far: this.data.far,
      objects: this.data.objects,
      origin: this.data.rayOrigin,
      showLine: true, // Mostrar rayo para depuración
      lineColor: 'white',
      lineOpacity: 0.5
    });
    
    // Configuramos el cursor según el origen del rayo
    this.updateCursorMode(this.data.mode);
    
    // Configuramos animaciones si están habilitadas
    if (this.data.enableAnimations) {
      this.setupAnimations();
    }
    
    // Eventos del cursor
    this.setupCursorEvents();
    
    // Configurar específicos según el modo
    this.setupSpecificMode(this.data.mode);
    
    // Log después de la configuración
    console.log('[VRCursor] Cursor inicializado completamente en modo:', this.data.mode);
    
    // Programamos un log para verificar los elementos clickable en la escena
    setTimeout(() => {
      const clickables = document.querySelectorAll('.clickable');
      console.log('[VRCursor] Elementos con clase .clickable en la escena:', clickables.length);
      clickables.forEach(el => {
        console.log(' - Elemento clickable:', el.id || el.tagName, el);
      });
    }, 2000);
  },
  // Función para verificar si un elemento es "clickable" y debe recibir auto-clic
  isAutoClickable: function(el) {
    if (!el) return false;
    
    // Evitar logs excesivos - solo mostrar depuración si está activado
    if (this.data.showLogs) {
      console.log('[VRCursor] Evaluando si es clickable:', 
        el.id || 'sin-id', 
        'Clases:', el.className,
        'Tipo:', el.tagName);
    }
    
    // Si se debe excluir planos de video, verificar si es un plano de video
    // Permitir barra de progreso incluso si está configurado para excluir video-plane
    if (this.data.excludeVideoPlane && el.id && el.id.includes('video-plane') && !el.id.includes('progress')) {
      if (this.data.showLogs) {
        console.log('[VRCursor] Elemento excluido para auto-clic (video-plane):', el.id);
      }
      return false;
    }
    
    // Caso especial: detectar barra de progreso por su ID
    if (el.id && el.id.includes('progress-bar')) {
      if (this.data.showLogs) {
        console.log('[VRCursor] Barra de progreso detectada como clickable:', el.id);
      }
      return true;
    }
    
    // Caso especial: detectar elementos con IDs específicos para la interacción
    if (el.id && (el.id.includes('button') || el.id.includes('control'))) {
      if (this.data.showLogs) {
        console.log('[VRCursor] Elemento interactivo detectado por ID:', el.id);
      }
      return true;
    }
    
    // Verificar si tiene la clase específica para auto-clic
    const isClickable = el.classList && el.classList.contains && el.classList.contains('clickable');
    
    // Log más detallado sobre la decisión
    if (isClickable && this.data.showLogs) {
      console.log('[VRCursor] Elemento con clase clickable detectado:', el.id || el.tagName);
    }
    
    return isClickable;
  },
  
  // Detectar cambios en el modo VR
  bindVRModeChangeHandler: function() {
    const sceneEl = this.el.sceneEl;
    
    // Controlador para la entrada a modo VR
    sceneEl.addEventListener('enter-vr', this.onEnterVR.bind(this));
    
    // Controlador para la salida de modo VR
    sceneEl.addEventListener('exit-vr', this.onExitVR.bind(this));
  },
  
  onEnterVR: function() {
    console.log('[VRCursor] Usuario entró en modo VR');
    this.isInVRMode = true;
    
    // Si está configurado para cambiar automáticamente a modo fuse en VR
    if (this.data.autoSwitchToFuseInVR) {
      this.originalMode = this.data.mode; // Guardar el modo original
      this.updateCursorMode('fuse'); // Cambiar a modo fuse
      console.log('[VRCursor] Cursor cambiado a modo fuse automáticamente');
    }
  },
  
  onExitVR: function() {
    console.log('[VRCursor] Usuario salió del modo VR');
    this.isInVRMode = false;
    
    // Si se cambió automáticamente, restaurar el modo original
    if (this.data.autoSwitchToFuseInVR && this.originalMode) {
      this.updateCursorMode(this.originalMode);
      console.log('[VRCursor] Cursor restaurado a modo', this.originalMode);
    }
    
    // Limpiar cualquier timeout de fuse pendiente
    if (this.fuseTimeoutId) {
      clearTimeout(this.fuseTimeoutId);
      this.fuseTimeoutId = null;
    }
  },
  
  // Actualizar el modo del cursor
  updateCursorMode: function(mode) {
    // Limpiar configuración previa
    this.cleanupCurrentMode();
    
    // Establecer el nuevo modo
    this.data.mode = mode;
    
    // Configurar el cursor según el nuevo modo
    this.setupSpecificMode(mode);
    
    console.log('[VRCursor] Modo de cursor actualizado a:', mode);
  },
  
  // Limpiar el modo actual
  cleanupCurrentMode: function() {
    // Limpiar temporizadores
    if (this.fuseTimeoutId) {
      clearTimeout(this.fuseTimeoutId);
      this.fuseTimeoutId = null;
    }
    
    // Limpiar estado de fuse
    this.isFusing = false;
    
    // Limpiar eventos específicos de cada modo
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
    }
    
    // Detener reconocimiento de voz
    if (this.recognition) {
      this.recognition.stop();
    }
    
    // Limpiar intervalo de gaze
    if (this.gazeInterval) {
      clearInterval(this.gazeInterval);
    }
  },
  
  setupAnimations: function() {
    // Animación de click
    this.el.setAttribute('animation__click', {
      property: 'scale',
      startEvents: 'click',
      easing: 'easeInCubic',
      dur: 150,
      from: '0.1 0.1 0.1',
      to: '1 1 1'
    });
    
    // Animación de fuse (si aplica)
    if (this.data.mode === 'fuse') {
      this.el.setAttribute('animation__fusing', {
        property: 'scale',
        startEvents: 'fusing',
        easing: 'easeInCubic',
        dur: this.data.fuseTimeout,
        from: '1 1 1',
        to: '0.5 0.5 0.5'
      });
      
      this.el.setAttribute('animation__fusedone', {
        property: 'scale',
        startEvents: 'click',
        easing: 'easeOutElastic',
        dur: 800,
        to: '1 1 1'
      });
    }
  },
  
  setupCursorEvents: function() {
    const el = this.el;
    
    // Eventos estándar del cursor
    el.addEventListener('mouseenter', this.onIntersectionStart.bind(this));
    el.addEventListener('mouseleave', this.onIntersectionEnd.bind(this));
    el.addEventListener('click', this.onClick.bind(this));
    
    // Necesario para el modo fuse
    if (this.data.mode === 'fuse') {
      el.addEventListener('fusing', this.onFusing.bind(this));
    }
  },    // Eliminando esta definición duplicada, se mantiene solo la versión al inicio del componente
  
  // Modo de espera (fuse)
  setupFuseMode: function() {
    // Más verboso para depurar
    console.log('[VRCursor] Modo fuse activado - Esperando', this.data.fuseTimeout / 1000, 'segundos para auto-clic en elementos clickable');
    
    // Configurar raycaster según el contexto
    // En modo VR, usamos rayOrigin: entity para que el rayo salga desde la cámara
    // En modo web, usamos rayOrigin: mouse para que siga al cursor del mouse
    const rayOrigin = this.isInVRMode ? 'entity' : 'mouse';
      // Configurar raycaster con un objeto completo en lugar de propiedades individuales
    this.el.setAttribute('raycaster', {
      far: this.data.far,
      objects: '.clickable, [id*=progress-bar], [id*=progressBarBg]', // Buscar elementos clickables y barras de progreso
      rayOrigin: rayOrigin,
      showLine: true,
      lineColor: 'red', // Color rojo para depurar mejor
      lineOpacity: 0.7  // Más visible
    });
    
    console.log('[VRCursor] Raycaster configurado en modo', rayOrigin);
    
    // Configurar gestor para determinar cuándo iniciar/cancelar fuse
    this.onIntersectionStartForFuse = (event) => {
      // Depuración siempre visible - importante para resolver el problema
      console.log('[VRCursor] Intersección detectada:', 
        event.detail.intersections ? event.detail.intersections.length : 'ninguna',
        'elementos');
      
      let intersectedEl = null;
      
      // Procesar dependiendo del tipo de evento (VR o web)
      if (event.detail.intersectedEls && event.detail.intersectedEls.length > 0) {
        // Modo VR - usar el primer elemento del array de intersecciones
        intersectedEl = event.detail.intersectedEls[0];
        console.log('[VRCursor] Modo VR: Elemento intersectado:', 
          intersectedEl.id || intersectedEl.tagName, 
          'Tiene clase clickable:', intersectedEl.classList.contains('clickable'));
      } else if (event.detail.intersection && event.detail.intersection.object) {
        // Modo web - obtener el elemento del objeto de intersección
        if (event.detail.intersection.object.el) {
          intersectedEl = event.detail.intersection.object.el;
          console.log('[VRCursor] Modo web: Elemento intersectado:', 
            intersectedEl.id || intersectedEl.tagName,
            'Tiene clase clickable:', intersectedEl.classList.contains('clickable'));
        }
      }
      
      if (!intersectedEl) {
        console.log('[VRCursor] No se encontró un elemento intersectado válido');
        return;
      }
      
      this.intersectedEl = intersectedEl;
        // Usar la función mejorada para verificar si es clickable
      if (!this.isAutoClickable(intersectedEl)) {
        console.log('[VRCursor] Elemento no clickable según criterios extendidos:', 
          intersectedEl.id || intersectedEl.tagName);
        return;
      }
      
      // Si llegamos aquí, el elemento es clickable según nuestros criterios
      
      // El elemento es clickable y no está excluido
      console.log('[VRCursor] ¡Iniciando fuse en elemento clickable!', 
        intersectedEl.id || intersectedEl.tagName);
        
      // Marcar que estamos en proceso de fuse
      this.isFusing = true;
      
      // Cambiar color del cursor para indicar fuse
      this.el.setAttribute('material', 'color', this.data.activeColor);
      
      // Cancelar cualquier temporizador anterior
      if (this.fuseTimeoutId) {
        clearTimeout(this.fuseTimeoutId);
      }
      
      // Crear un nuevo temporizador para el auto-clic
      this.fuseTimeoutId = setTimeout(() => {
        if (this.isFusing && this.intersectedEl) {
          // Asegurarnos que el elemento es aún válido y clickable
          if (this.intersectedEl.isConnected && this.intersectedEl.classList.contains('clickable')) {
            console.log('[VRCursor] ¡FUSE COMPLETADO! Emitiendo clic automático en:', 
              this.intersectedEl.id || this.intersectedEl.tagName);
              
            // Emitir evento clic
            this.emitClickEvent();
            
            // Visual feedback (parpadeo)
            this.el.setAttribute('material', 'color', '#FFFFFF');
            setTimeout(() => {
              this.el.setAttribute('material', 'color', this.data.color);
            }, 300);
          } else {
            console.log('[VRCursor] El elemento ya no es válido o no es clickable');
          }
        } else {
          console.log('[VRCursor] No hay elemento o no está fusionando al completar timeout');
        }
      }, this.data.fuseTimeout);
      
      console.log('[VRCursor] Temporizador fuse iniciado, completará en', this.data.fuseTimeout/1000, 'segundos');
      
      // Emitir evento para animación
      this.el.emit('fusing', {
        target: intersectedEl,
        fuse: true,
        intersectedEl: intersectedEl
      });
    };
    
    this.onIntersectionEndForFuse = (event) => {
      console.log('[VRCursor] Intersección terminada');
      
      // Limpiar temporizador
      if (this.fuseTimeoutId) {
        clearTimeout(this.fuseTimeoutId);
        this.fuseTimeoutId = null;
        console.log('[VRCursor] Temporizador fuse cancelado');
      }
      
      // Restaurar color normal del cursor
      this.el.setAttribute('material', 'color', this.data.color);
      
      // Marcar que ya no estamos en proceso de fuse
      this.isFusing = false;
    };
    
    // Registrar eventos
    this.el.addEventListener('raycaster-intersection', this.onIntersectionStartForFuse);
    this.el.addEventListener('raycaster-intersection-cleared', this.onIntersectionEndForFuse);
  },
  
  // Modo de teclado
  setupKeyMode: function() {
    // Agregar evento de teclado al documento
    this.keydownHandler = this.onKeyDown.bind(this);
    document.addEventListener('keydown', this.keydownHandler);
    
    console.log('[VRCursor] Modo teclado activado - Presiona la tecla con código', this.data.keyCode, 'para clic');
  },
  
  // Modo de voz
  setupVoiceMode: function() {
    // Comprobar si el navegador soporta reconocimiento de voz
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.lang = 'es-ES'; // Idioma para reconocimiento
      
      // Configurar comandos de voz
      this.recognition.onresult = (event) => {
        const last = event.results.length - 1;
        const command = event.results[last][0].transcript.trim().toLowerCase();
        
        // Comandos básicos
        if (command === 'clic' || command === 'click' || command === 'seleccionar') {
          this.emitClickEvent();
        }
      };
      
      // Iniciar reconocimiento
      try {
        this.recognition.start();
        console.log('[VRCursor] Modo voz activado - Di "clic", "click" o "seleccionar" para interactuar');
      } catch (e) {
        console.error('[VRCursor] Error al iniciar reconocimiento de voz:', e);
      }
    } else {
      console.warn('[VRCursor] El reconocimiento de voz no está soportado en este navegador');
    }
  },
  
  // Modo de mirada fija
  setupGazeMode: function() {
    // Similar al modo fuse pero con comportamientos adicionales
    this.gazeTime = 0;
    this.gazeTimeout = 1500; // 1.5 segundos de mirada fija
    
    this.lastIntersectedEl = null;
    this.gazeInterval = setInterval(() => {
      if (this.intersectedEl && this.intersectedEl === this.lastIntersectedEl) {
        this.gazeTime += 100;
        if (this.gazeTime >= this.gazeTimeout) {
          this.emitClickEvent();
          this.gazeTime = 0;
        }
      } else {
        this.gazeTime = 0;
        this.lastIntersectedEl = this.intersectedEl;
      }
    }, 100);
    
    console.log('[VRCursor] Modo gaze activado - Mantén la mirada fija para interactuar');
  },
  
  // Configurar el modo específico según el tipo
  setupSpecificMode: function(mode) {
    if (mode === 'fuse') {
      this.setupFuseMode();
    } else if (mode === 'key') {
      this.setupKeyMode();
    } else if (mode === 'voice') {
      this.setupVoiceMode();
    } else if (mode === 'gaze') {
      this.setupGazeMode();
    } else if (mode === 'auto') {
      // En modo auto, usamos fuse en VR y mouse normalmente
      if (this.isInVRMode) {
        this.setupFuseMode();
      } else {
        // Mouse es el modo por defecto, no necesita setup especial
        this.el.setAttribute('raycaster', 'rayOrigin', 'mouse');
      }
    } else {
      // Mouse es el modo por defecto
      this.el.setAttribute('raycaster', 'rayOrigin', 'mouse');
    }
  },

  onIntersectionStart: function(event) {
    const intersectedEl = event.detail.intersection && event.detail.intersection.object.el;
    
    if (intersectedEl) {
      this.intersectedEl = intersectedEl;
      
      // Cambiar color del cursor al pasar por encima
      this.el.setAttribute('material', 'color', this.data.hoverColor);
      
      // Emitir evento para el objeto intersectado
      this.intersectedEl.emit('cursor-hovered', {
        cursorEl: this.el
      });
    }
  },
  
  onIntersectionEnd: function(event) {
    const currentIntersectedEl = this.intersectedEl;
    
    // Restaurar color del cursor
    this.el.setAttribute('material', 'color', this.data.color);
    
    if (currentIntersectedEl) {
      // Emitir evento para el objeto que ya no está intersectado
      currentIntersectedEl.emit('cursor-unhovered', {
        cursorEl: this.el
      });
      
      this.intersectedEl = null;
    }
  },
  
  onClick: function(event) {
    if (this.intersectedEl) {
      // Cambiar color del cursor al hacer click
      this.el.setAttribute('material', 'color', this.data.activeColor);
      setTimeout(() => {
        this.el.setAttribute('material', 'color', 
          this.intersectedEl ? this.data.hoverColor : this.data.color);
      }, 150);
    }
  },
  
  onFusing: function(event) {
    this.isFusing = true;
  },
  
  onKeyDown: function(event) {
    // Verificar si la tecla presionada coincide con la configurada
    if (event.keyCode === this.data.keyCode && this.intersectedEl) {
      this.emitClickEvent();
    }
  },
    // Método mejorado para emitir evento de clic
  emitClickEvent: function() {
    if (this.intersectedEl) {
      console.log('[VRCursor] Emitiendo evento click en:', this.intersectedEl.id || this.intersectedEl.tagName);
      
      try {
        // Obtener datos de la intersección
        const intersection = this.el.components.raycaster.getIntersection(this.intersectedEl);
        
        // Verificar si es la barra de progreso
        const isProgressBar = this.intersectedEl.id && 
          (this.intersectedEl.id.includes('progress-bar') || this.intersectedEl.id.includes('progressBar'));
        
        if (isProgressBar) {
          console.log('[VRCursor] Click en barra de progreso detectado!');
        }
        
        // Evento especial para la barra de progreso
        if (isProgressBar) {
          // Buscar el componente vr-local-video más cercano
          let videoComponent = this.intersectedEl;
          while (videoComponent && !videoComponent.components['vr-local-video']) {
            videoComponent = videoComponent.parentNode;
          }
          
          if (videoComponent && videoComponent.components['vr-local-video']) {
            console.log('[VRCursor] Encontrado componente vr-local-video, aplicando seekVideo');
            const component = videoComponent.components['vr-local-video'];
            
            // Llamar directamente a seekVideo con los datos necesarios
            component.seekVideo({
              detail: {
                intersection: intersection,
                target: this.intersectedEl
              }
            });
          } else {
            console.warn('[VRCursor] No se encontró componente vr-local-video para la barra de progreso');
          }
        }
        
        // Emitir evento click en el objeto intersectado
        this.intersectedEl.emit('click', {
          cursorEl: this.el,
          intersection: intersection
        });
        
        // Emitir eventos nativos para mejor compatibilidad
        const clickEvent = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true
        });
        
        this.intersectedEl.dispatchEvent(clickEvent);
        
        // Emitir evento click en el cursor
        this.el.emit('click', {
          target: this.intersectedEl,
          intersection: intersection
        });
        
        console.log('[VRCursor] Click emitido correctamente');
      } catch (error) {
        console.error('[VRCursor] Error al emitir click:', error);
      }
    } else {
      console.warn('[VRCursor] Intentó emitir click pero no hay elemento intersectado');
    }
  },
    // Limpiar al remover el componente - mejorado para prevenir errores
  remove: function() {
    console.log('[VRCursor] Limpiando componente de cursor');
    
    try {
      // Eliminar referencias a elementos intersectados para evitar errores
      this.intersectedEl = null;
      this.isFusing = false;
      
      // Eliminar eventos
      if (this.keydownHandler) {
        document.removeEventListener('keydown', this.keydownHandler);
        this.keydownHandler = null;
      }
      
      // Detener reconocimiento de voz
      if (this.recognition) {
        this.recognition.stop();
        this.recognition = null;
      }
      
      // Limpiar intervalo de gaze
      if (this.gazeInterval) {
        clearInterval(this.gazeInterval);
        this.gazeInterval = null;
      }
      
      // Limpiar temporizadores de fuse
      if (this.fuseTimeoutId) {
        clearTimeout(this.fuseTimeoutId);
        this.fuseTimeoutId = null;
      }
      
      // Eliminar todos los controladores de eventos posibles
      if (this.onIntersectionStartForFuse) {
        this.el.removeEventListener('raycaster-intersection', this.onIntersectionStartForFuse);
        this.el.removeEventListener('raycaster-intersection-cleared', this.onIntersectionEndForFuse);
        this.onIntersectionStartForFuse = null;
        this.onIntersectionEndForFuse = null;
      }
      
      // Eliminar listeners del cambio de modo VR
      const sceneEl = this.el.sceneEl;
      if (sceneEl) {
        sceneEl.removeEventListener('enter-vr', this.onEnterVR);
        sceneEl.removeEventListener('exit-vr', this.onExitVR);
      }
      
      // Prevenir NaN en la geometría al eliminar
      try {
        // Establecer una geometría básica y válida antes de remover
        this.el.setAttribute('geometry', {
          primitive: 'ring',
          radiusInner: 0.01,
          radiusOuter: 0.02
        });
      } catch (err) {
        console.warn('[VRCursor] Error al resetear geometría en la limpieza:', err);
      }
      
      console.log('[VRCursor] Componente limpiado correctamente');
    } catch (error) {
      console.error('[VRCursor] Error durante la limpieza del cursor:', error);
    }
  }
});

export default {};
