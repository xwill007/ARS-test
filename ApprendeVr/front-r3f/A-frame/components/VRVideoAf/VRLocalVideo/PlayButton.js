AFRAME.registerComponent('play-button', {
  schema: {
    videoEl: {type: 'selector'},
    videoId: {type: 'string'} // Añadir opción para usar ID directo
  },
  
  init: function() {
    const el = this.el;
    
    // Asegurarse de que el elemento tenga la clase clickable
    el.classList.add('clickable');
    
    // Cambiar color al pasar el cursor
    el.addEventListener('mouseenter', () => {
      console.log('Cursor sobre botón de play');
      el.setAttribute('material', 'opacity', 0.7);
    });
    
    el.addEventListener('mouseleave', () => {
      el.setAttribute('material', 'opacity', 1.0);
    });
    
    // Manejar click/tap
    const handleClick = () => {
      console.log('Click en botón de play');
      
      // Intentar obtener el video de múltiples formas
      let video = this.data.videoEl;
      
      if (!video && this.data.videoId) {
        // Buscar por ID en todo el documento
        console.log('Buscando video por ID:', this.data.videoId);
        video = document.getElementById(this.data.videoId);
      }
      
      // También buscar video en el componente padre
      if (!video) {
        console.log('Buscando video en el componente padre');
        const parentEntity = el.parentElement.parentElement;
        if (parentEntity && parentEntity.components && parentEntity.components['vr-local-video']) {
          video = parentEntity.components['vr-local-video'].video;
          console.log('Video encontrado en componente padre:', video);
        }
      }
      
      if (!video) {
        console.error('No se encontró el elemento de video');
        return;
      }
        if (video.paused) {
        console.log('Intentando reproducir video');
        video.muted = false;
        const playPromise = video.play();
        
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error('Error al reproducir video:', error);
            video.muted = true;
            video.play().catch(e => console.error('Fallo incluso con mute:', e));
          });
        }
        
        el.setAttribute('material', 'color', '#ff0000');
        if (this.textEl) this.textEl.setAttribute('value', '⏸️');
      } else {
        console.log('Pausando video');
        video.pause();
        el.setAttribute('material', 'color', '#00ff00');
        if (this.textEl) this.textEl.setAttribute('value', '▶️');
      }
    };
      // Buscar si hay un componente padre vr-local-video
    const parentComponent = this.findParentComponent('vr-local-video');
    if (parentComponent && typeof parentComponent.togglePlayback === 'function') {
      console.log('Encontrado componente padre con togglePlayback');
      // Usar sólo el método del padre para evitar múltiples llamadas
      el.addEventListener('click', () => {
        console.log('Delegando clic al componente padre');
        parentComponent.togglePlayback();
      });
    } else {
      // Si no hay padre, usar nuestro propio manejador
      el.addEventListener('click', handleClick);
      el.addEventListener('mousedown', handleClick);
    }
    
    // Añadir texto al botón
    this.textEl = document.createElement('a-text');
    this.textEl.setAttribute('value', '▶️');
    this.textEl.setAttribute('position', '0 0 0.01');
    this.textEl.setAttribute('align', 'center');
    this.textEl.setAttribute('color', 'black');
    this.textEl.setAttribute('scale', '2 2 2');
    el.appendChild(this.textEl);    // Guardar la referencia al video para usarla más tarde
    if (video) {
      this.videoElement = video;
      
      // Monitorear cambios en el video
      this.videoElement.addEventListener('play', () => {
        console.log('Evento de PLAY detectado');
        el.setAttribute('material', 'color', '#ff0000');
        if (this.textEl) this.textEl.setAttribute('value', '⏸️');
      });
      
      this.videoElement.addEventListener('pause', () => {
        console.log('Evento de PAUSE detectado');
        el.setAttribute('material', 'color', '#00ff00');
        if (this.textEl) this.textEl.setAttribute('value', '▶️');
      });
    } else {
      console.warn("No se encontró un elemento de video válido para monitorear");
    }
  },
  
  // Función para buscar un componente en los elementos padres
  findParentComponent: function(componentName) {
    let element = this.el;
    while (element) {
      if (element.components && element.components[componentName]) {
        return element.components[componentName];
      }
      element = element.parentNode;
    }
    return null;
  }
});
