import React, { useEffect } from 'react';

// Constantes de configuración
const showLogs = false; // Cambiar a true para activar todos los logs de depuración
const numWords = 100;
const y = 1;
const posicionDomo = `0 ${y} 0`;

/**
 * Función principal que coordina la inicialización y configuración del domo VR
 * @param {HTMLElement} container - Elemento contenedor donde se montará el domo
 * @param {string} position - Posición inicial en formato "x y z"
 * @param {number} numPalabras - Número de palabras a mostrar
 */
const main = async (container, position = posicionDomo, numPalabras = numWords) => {
  if (showLogs) console.log('Iniciando proceso de creación de VR Domo...');
  
  // 1. Esperar que A-Frame esté disponible
  await ensureAFrameLoaded();
  if (showLogs) console.log('A-Frame cargado correctamente');
  
  // 2. Registrar componentes personalizados
  registerPanelFlipComponent();
  if (showLogs) console.log('Componentes personalizados registrados');
  
  // 3. Configurar sistema de interacción
  setupRaycaster();
  if (showLogs) console.log('Sistema de raycasting configurado');
  
  // 4. Calcular geometría del domo
  const geometryData = calculateDomeGeometry(position, numPalabras);
  if (showLogs) console.log('Geometría calculada:', geometryData);
  
  // 5. Procesar atributos de los paneles (se ejecutará después del renderizado)
  setTimeout(() => {
    processPanelAttributes();
    if (showLogs) console.log('Atributos de paneles procesados');
  }, 500);

  // 6. Configurar eventos globales
  setupGlobalEvents();
  if (showLogs) console.log('Eventos globales configurados');
  
  return {
    geometryData,
    cleanup: () => {
      // Limpiar event listeners y recursos
      cleanupResources();
      if (showLogs) console.log('Recursos liberados');
    }
  };
};

/**
 * Asegura que A-Frame está cargado antes de continuar
 * @returns {Promise} Promesa que se resuelve cuando A-Frame está disponible
 */
const ensureAFrameLoaded = () => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.AFRAME) {
      resolve();
      return;
    }
    
    const checkAFrame = () => {
      if (typeof window !== 'undefined' && window.AFRAME) {
        resolve();
        return;
      }
      
      const aframeLoaded = () => {
        if (window.AFRAME) {
          window.removeEventListener('aframe-loaded', aframeLoaded);
          resolve();
        }
      };
      
      window.addEventListener('aframe-loaded', aframeLoaded);
      
      // Timeout como fallback
      setTimeout(() => {
        window.removeEventListener('aframe-loaded', aframeLoaded);
        if (typeof window !== 'undefined' && window.AFRAME) {
          resolve();
        } else {
          console.warn('Timeout alcanzado esperando A-Frame, continuando de todas formas');
          resolve();
        }
      }, 2000);
    };
    
    checkAFrame();
  });
};

/**
 * Configura eventos globales para el domo
 */
const setupGlobalEvents = () => {
  if (typeof window === 'undefined') return;
  
  // Evento de redimensionamiento de ventana
  window.addEventListener('resize', () => {
    if (showLogs) console.log('Ventana redimensionada, ajustando vista VR');
    // Aquí podrías ajustar elementos según el nuevo tamaño si fuera necesario
  });
  
  // Otros eventos globales que sean necesarios
  document.addEventListener('keydown', (event) => {
    // Por ejemplo, toggle de debug con la tecla 'D'
    if (event.key === 'd' && event.ctrlKey) {
      const scene = document.querySelector('a-scene');
      if (scene) {
        const debugEnabled = scene.getAttribute('debug') || false;
        scene.setAttribute('debug', !debugEnabled);
        if (showLogs) console.log(`Modo debug: ${!debugEnabled}`);
      }
    }
  });
};

/**
 * Limpia los recursos utilizados
 */
const cleanupResources = () => {
  if (typeof window === 'undefined') return;
  
  // Eliminar listeners
  window.removeEventListener('resize', () => {});
  document.removeEventListener('keydown', () => {});
  
  // Limpiar componentes A-Frame si es necesario
  if (window.AFRAME && AFRAME.components['panel-flip']) {
    // Podríamos hacer limpieza adicional si fuera necesario
  }
};

/**
 * Calcula el radio del domo basado en el número de palabras
 * @param {number} numPalabras - Número de palabras a mostrar
 * @returns {number} Radio calculado para el domo
 */
const calcularRadio = (numPalabras) => {
  return Math.ceil(Math.sqrt(numPalabras / 1000) * 60);
};

/**
 * Registra el componente panel-flip en A-Frame
 */
const registerPanelFlipComponent = () => {
  if (!window.AFRAME) {
    console.error('A-Frame no disponible todavía');
    return;
  }
  
  try {
    // Limpia cualquier registro previo
    if (AFRAME.components['panel-flip']) {
      delete AFRAME.components['panel-flip'];
    }
    
    if (showLogs) console.log('Registrando componente panel-flip');
    
    AFRAME.registerComponent('panel-flip', {
      schema: {
        palabraEs: {type: 'string', default: ''},
        palabraEn: {type: 'string', default: ''}
      },
      
      init: function() {
        const el = this.el;
        if (showLogs) console.log('Inicializando panel-flip en elemento:', el.id);
        
        // NUEVO: Comprobar si tenemos valores placeholder y corregirlos
        if (this.data.palabraEs === 'PALABRA_ES' || this.data.palabraEn === 'PALABRA_EN') {
          const palabraEs = el.getAttribute('data-palabra-es');
          const palabraEn = el.getAttribute('data-palabra-en');
          
          if (palabraEs && palabraEn) {
            if (showLogs) console.log(`Corrigiendo placeholder en ${el.id}: ES=${palabraEs}, EN=${palabraEn}`);
            el.setAttribute('panel-flip', `palabraEs: ${palabraEs}; palabraEn: ${palabraEn}`);
          }
        }
        
        // DEPURACIÓN: Verificar que los datos se están recibiendo correctamente
        if (showLogs) console.log('Datos recibidos:', JSON.stringify(this.data));
        
        // NUEVO: Recuperar estado desde localStorage si existe
        const panelId = el.id;
        const estadoGuardado = localStorage.getItem(`panel-estado-${panelId}`);
        this.isFlipped = estadoGuardado === 'true';
        
        this.lastClickTime = 0;
        this.debounceDelay = 300;
        
        // MEJORA: Asegurando que el elemento es interactuable
        el.setAttribute('class', 'clickable');
        
        // MEJORA: Bind más seguro para onClick
        this.boundOnClick = this.onClick.bind(this);
        el.addEventListener('click', this.boundOnClick);
        
        // MEJORA: Usar mouseenter/leave para feedback visual
        el.addEventListener('mouseenter', () => {
          if (showLogs) console.log('Mouse ENTER en panel:', el.id);
          el.setAttribute('material', 'emissive', '#FF5555');
        });
        
        el.addEventListener('mouseleave', () => {
          if (showLogs) console.log('Mouse LEAVE en panel:', el.id);
          el.setAttribute('material', 'emissive', '#303030');
        });
        
        // CORREGIDO: Mejorar la búsqueda del elemento de texto
        this.textoElement = null;
        const childrenList = el.querySelectorAll('*');
        for (let i = 0; i < childrenList.length; i++) {
          if (childrenList[i].classList && childrenList[i].classList.contains('texto-panel')) {
            this.textoElement = childrenList[i];
            break;
          }
        }
        
        if (!this.textoElement) {
          console.warn('No se encontró el elemento de texto en el panel:', el.id);
          this.textoElement = document.createElement('a-entity');
          this.textoElement.classList.add('texto-panel');
          this.textoElement.setAttribute('position', '0 0 0.11');
          el.appendChild(this.textoElement);
        }
        
        // NUEVO: Aplicar el estado guardado al inicializar
        this.aplicarEstado();
      },
      
      aplicarEstado: function() {
        const el = this.el;
        
        const palabraEs = this.data.palabraEs || '';
        const palabraEn = this.data.palabraEn || '';
        
        if (showLogs) console.log(`Aplicando estado para panel: ${el.id}, isFlipped: ${this.isFlipped}`);
        if (showLogs) console.log(`Palabras disponibles: ES='${palabraEs}', EN='${palabraEn}'`);
        
        // Cambiar color según estado
        el.setAttribute('material', 'color', this.isFlipped ? '#6699CC' : '#C0C0C0');
        
        if (this.textoElement) {
          const palabraMostrar = this.isFlipped ? palabraEs : palabraEn;
          const textColor = this.isFlipped ? '#4CAF50' : '#FFFFFF';
          
          if (showLogs) console.log(`Actualizando texto de panel a: '${palabraMostrar}'`);
          
          this.textoElement.setAttribute('text', {
            value: palabraMostrar,
            color: textColor,
            align: 'center',
            width: 5,
            wrapCount: 10,
            font: 'mozillavr'
          });
        } else {
          console.error('No hay elemento de texto para actualizar en panel:', el.id);
        }
      },

      onClick: function(evt) {
        if (showLogs) console.log('CLICK detectado en panel:', this.el.id);
        
        if (evt) {
          evt.stopPropagation();
          evt.preventDefault();
        }
        
        const now = Date.now();
        if (now - this.lastClickTime < this.debounceDelay) {
          if (showLogs) console.log('Ignorando clic por debounce');
          return;
        }
        this.lastClickTime = now;
        
        this.handleClick();
      },
      
      handleClick: function() {
        const el = this.el;
        if (showLogs) console.log('PANEL CLICKEADO:', el.id);
        
        this.isFlipped = !this.isFlipped;
        
        localStorage.setItem(`panel-estado-${el.id}`, this.isFlipped);
        
        const palabraEs = this.data.palabraEs || '';
        const palabraEn = this.data.palabraEn || '';
        
        if (showLogs) console.log(`Palabras del panel: ES='${palabraEs}', EN='${palabraEn}', Nuevo estado: ${this.isFlipped}`);
        
        el.setAttribute('material', {
          color: this.isFlipped ? '#6699CC' : '#C0C0C0'
        });
        
        const panelPalabra = document.querySelector('#palabra-actual');
        if (panelPalabra) {
          const textoMostrar = `ESP: ${palabraEs}\nENG: ${palabraEn}`;
          if (showLogs) console.log('Mostrando palabras en panel central:', textoMostrar);
          
          panelPalabra.setAttribute('text', {
            value: textoMostrar,
            color: 'white',
            align: 'center',
            width: 2,
            wrapCount: 20
          });
        }
        
        setTimeout(() => {
          this.aplicarEstado();
        }, 0);
      }
    });
    
    if (showLogs) console.log('Componente panel-flip registrado correctamente');
  } catch (error) {
    console.error('Error al registrar componente panel-flip:', error);
  }
};

/**
 * Configura el sistema de raycasting para interacciones en VR
 */
const setupRaycaster = () => {
  if (!window.AFRAME) return;
  
  const scene = document.querySelector('a-scene');
  if (!scene) {
    console.error('No se encontró la escena de A-Frame');
    return;
  }
  
  if (showLogs) console.log('Configurando raycaster global...');
  
  let cursor = scene.querySelector('[cursor]');
  
  if (!cursor) {
    const camera = scene.querySelector('[camera]');
    
    if (camera) {
      if (showLogs) console.log('Añadiendo cursor a la cámara existente');
      cursor = document.createElement('a-entity');
      cursor.setAttribute('cursor', 'rayOrigin: mouse; fuse: false');
      cursor.setAttribute('raycaster', 'objects: .clickable; far: 100');
      cursor.setAttribute('position', '0 0 -1');
      cursor.setAttribute('geometry', 'primitive: ring; radiusInner: 0.01; radiusOuter: 0.02');
      cursor.setAttribute('material', 'color: white; shader: flat');
      camera.appendChild(cursor);
    } else {
      if (showLogs) console.log('Creando entidad con raycaster global');
      const raycasterEntity = document.createElement('a-entity');
      raycasterEntity.setAttribute('id', 'global-raycaster');
      raycasterEntity.setAttribute('raycaster', 'objects: .clickable; far: 100');
      raycasterEntity.setAttribute('cursor', 'rayOrigin: mouse');
      scene.appendChild(raycasterEntity);
    }
  } else {
    if (showLogs) console.log('Cursor existente encontrado, actualizando configuración');
    cursor.setAttribute('raycaster', 'objects: .clickable; far: 100');
  }
  
  scene.addEventListener('click', function(e) {
    if (showLogs) console.log('Click global detectado en:', e.target.id || e.target);
  });
  
  if (showLogs) console.log('Raycaster configurado correctamente');
};

/**
 * Procesa los atributos de datos de los paneles después del renderizado
 */
const processPanelAttributes = () => {
  if (!window.AFRAME) return;
  
  setTimeout(() => {
    const paneles = document.querySelectorAll('[panel-flip]');
    if (showLogs) console.log(`Procesando ${paneles.length} paneles para transferir atributos`);
    
    paneles.forEach(panel => {
      if (panel.hasAttribute('processed')) return;
      
      const palabraEs = panel.getAttribute('data-palabra-es') || '';
      const palabraEn = panel.getAttribute('data-palabra-en') || '';
      
      if (palabraEs && palabraEn) {
        if (showLogs) console.log(`Panel ${panel.id}: Transferidos datos ES='${palabraEs}', EN='${palabraEn}'`);
        panel.setAttribute('panel-flip', `palabraEs: ${palabraEs}; palabraEn: ${palabraEn}`);
        panel.setAttribute('processed', 'true');
      }
    });
  }, 500);
};

/**
 * Calcula la geometría del domo basada en la posición y el número de palabras
 * @param {string} position - Posición inicial en formato "x y z"
 * @param {number} numPalabras - Número de palabras a mostrar
 * @returns {Object} Datos de geometría calculados
 */
const calculateDomeGeometry = (position, numPalabras) => {
  const radius = calcularRadio(numPalabras);
  const [x, y, z] = position.split(' ').map(parseFloat);
  const numAnillos = Math.floor(radius/2.4);
  const escala = radius/9;
  const anguloTotal = Math.PI / 2;
  const anguloAnillo = anguloTotal / numAnillos;
  
  return {
    radius,
    x, y, z,
    numAnillos,
    escala,
    anguloAnillo
  };
};

/**
 * Genera los elementos del domo basados en la geometría calculada
 * @param {Object} geometryData - Datos de geometría del domo
 * @returns {Array} Elementos JSX para renderizar
 */
const generateDomeElements = (geometryData) => {
  const { radius, x, y, z, numAnillos, escala, anguloAnillo } = geometryData;
  const elementos = [];
  let n = 0;

  for (let i = 0; i < numAnillos; i++) {
    const phi = i * anguloAnillo;
    const radioAnillo = radius * Math.sin(phi);
    const alturaAnillo = y + radius * Math.cos(phi);
    const factorAncho = i === 0 ? 0.5 : 1.0;
    const anchoPaneles = Math.max(0.5, escala - (i / numAnillos) * 0.01) * factorAncho;
    const inclinacionAnillo = 90 - (phi * 180 / Math.PI);
    
    let numSegmentos;
    if (i === 0) {
      numSegmentos = Math.max(0, Math.floor(radioAnillo));
    } else {
      numSegmentos = Math.max(6, Math.floor(radioAnillo * 1.5));
    }
    
    const anguloSegmento = (2 * Math.PI) / numSegmentos;
    const anchoPanelActual = 2 * radioAnillo * Math.sin(anguloSegmento/2);
    
    for (let j = 0; j < numSegmentos; j++) {
      const theta = j * anguloSegmento;
      const segX = x + radioAnillo * Math.cos(theta);
      const segZ = z + radioAnillo * Math.sin(theta);
      const dirX = x - segX;
      const dirZ = z - segZ;
      const rotationY = Math.atan2(dirX, dirZ) * (180 / Math.PI);
      
      const palabraIndex = n % listaPalabras.length;
      const palabra = listaPalabras[palabraIndex];
      n++;
      
      const textScale = i === 0 ? "2 2 2" : "3 3 3";
      const panelId = `panel-${i}-${j}`;
      
      elementos.push(
        <a-box
          key={`${i}-${j}`}
          id={panelId}
          position={`${segX} ${alturaAnillo} ${segZ}`}
          width={anchoPanelActual}
          height={anchoPaneles}
          depth="0.2"
          material="color: #C0C0C0; metalness: 0.9; roughness: 0.1; emissive: #303030; emissiveIntensity: 0.2; side: double"
          rotation={`${inclinacionAnillo} ${rotationY} 0`}
          shadow="receive: true"
          data-palabra-es={palabra.es}
          data-palabra-en={palabra.en}
          panel-flip={`palabraEs: ${palabra.es}; palabraEn: ${palabra.en}`}
          class="clickable"
        > 
          <a-entity
            
            class="texto-panel"
            text={`value: ${palabra.en}; color: #FFFFFF; align: center; width: 5; wrapCount: 10; font: /fonts/Ultra-msdf/Ultra-msdf.json; fontImage: /fonts/Ultra-msdf/Ultra-msdf.png; shader: msdf`}
            position="0 0 0.11"
          ></a-entity>
        </a-box>
      );
    }
  }
  
  // Añadir luz en la cima del domo
  elementos.push(
    <a-light
      key="domo-light"
      type="point"
      color="rgb(243, 254, 191)"
      intensity="10"
      distance="10"
      decay="1.8"
      castShadow="true"
      radius="1"
      position={`0 1 2`}
    ></a-light>
  );
  
  return elementos;
};

/**
 * Componente VRDomo principal 
 */
const VRDomo = ({ position = posicionDomo, numPalabras = numWords }) => {
  // Ref para el contenedor
  const domoRef = React.useRef(null);
  
  // Estado para almacenar datos de geometría y elementos
  const [domoState, setDomoState] = React.useState(null);
  
  // Inicialización principal
  useEffect(() => {
    let cleanup = null;
    
    // Ejecutar la función principal cuando el componente se monte
    const initDomo = async () => {
      if (!domoRef.current) return;
      
      try {
        const result = await main(domoRef.current, position, numPalabras);
        setDomoState(result);
        cleanup = result.cleanup;
      } catch (error) {
        console.error('Error inicializando VR Domo:', error);
      }
    };
    
    initDomo();
    
    // Limpieza al desmontar
    return () => {
      if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [position, numPalabras]);
  
  // Calcular geometría y generar elementos
  const geometryData = domoState?.geometryData || calculateDomeGeometry(position, numPalabras);
  const elementos = generateDomeElements(geometryData);
  
  // Renderizar el domo y sus componentes
  return (
    <a-entity id="domo" ref={domoRef}>
      {elementos}
      
      {/* Panel grande para mostrar la palabra seleccionada */}
      <a-entity 
        id="palabra-actual" 
        position="0 0 -1.5" 
        text="value: Selecciona una palabra; color: white; align: center; width: 2; wrapCount: 20; baseline: center" 
        geometry="primitive: plane; width: 2.1; height: 0.7" 
        material="color: #333333; opacity: 0.7; side: double"
      ></a-entity>
    </a-entity>
  );
};

// Lista de 100 palabras para mostrar en los paneles (sin acentos)
const listaPalabras = [
  { es: "aire", en: "air" },
  { es: "agua", en: "water" },
  { es: "fuego", en: "fire" },
  { es: "tierra", en: "earth" },
  { es: "vida", en: "life" },
  { es: "amor", en: "love" },
  { es: "paz", en: "peace" },
  { es: "luz", en: "light" },
  { es: "cielo", en: "sky" },
  { es: "mar", en: "sea" },
  { es: "sol", en: "sun" },
  { es: "luna", en: "moon" },
  { es: "estrella", en: "star" },
  { es: "nube", en: "cloud" },
  { es: "viento", en: "wind" },
  { es: "lluvia", en: "rain" },
  { es: "nieve", en: "snow" },
  { es: "montana", en: "mountain" },
  { es: "rio", en: "river" },
  { es: "lago", en: "lake" },
  { es: "bosque", en: "forest" },
  { es: "arbol", en: "tree" },
  { es: "flor", en: "flower" },
  { es: "planta", en: "plant" },
  { es: "animal", en: "animal" },
  { es: "pajaro", en: "bird" },
  { es: "pez", en: "fish" },
  { es: "insecto", en: "insect" },
  { es: "humano", en: "human" },
  { es: "nino", en: "child" },
  { es: "familia", en: "family" },
  { es: "amigo", en: "friend" },
  { es: "casa", en: "house" },
  { es: "hogar", en: "home" },
  { es: "ciudad", en: "city" },
  { es: "pais", en: "country" },
  { es: "mundo", en: "world" },
  { es: "universo", en: "universe" },
  { es: "tiempo", en: "time" },
  { es: "espacio", en: "space" },
  { es: "color", en: "color" },
  { es: "sonido", en: "sound" },
  { es: "musica", en: "music" },
  { es: "arte", en: "art" },
  { es: "ciencia", en: "science" },
  { es: "historia", en: "history" },
  { es: "futuro", en: "future" },
  { es: "presente", en: "present" },
  { es: "pasado", en: "past" },
  { es: "cambio", en: "change" },
  { es: "movimiento", en: "movement" },
  { es: "energia", en: "energy" },
  { es: "fuerza", en: "strength" },
  { es: "poder", en: "power" },
  { es: "mente", en: "mind" },
  { es: "cuerpo", en: "body" },
  { es: "salud", en: "health" },
  { es: "felicidad", en: "happiness" },
  { es: "tristeza", en: "sadness" },
  { es: "alegria", en: "joy" },
  { es: "realidad", en: "reality" },
  { es: "verdad", en: "truth" },
  { es: "sabiduria", en: "wisdom" },
  { es: "conocimiento", en: "knowledge" },
  { es: "idea", en: "idea" },
  { es: "pensamiento", en: "thought" },
  { es: "palabra", en: "word" },
  { es: "libro", en: "book" },
  { es: "historia", en: "story" },
  { es: "camino", en: "path" },
  { es: "viaje", en: "journey" },
  { es: "aventura", en: "adventure" },
  { es: "descubrimiento", en: "discovery" },
  { es: "misterio", en: "mystery" },
  { es: "secreto", en: "secret" },
  { es: "memoria", en: "memory" },
  { es: "esperanza", en: "hope" },
  { es: "deseo", en: "desire" },
  { es: "voluntad", en: "will" },
  { es: "libertad", en: "freedom" },
  { es: "justicia", en: "justice" },
  { es: "igualdad", en: "equality" },
  { es: "respeto", en: "respect" },
  { es: "valor", en: "courage" },
  { es: "coraje", en: "bravery" },
  { es: "fortaleza", en: "strength" },
  { es: "compasion", en: "compassion" },
  { es: "generosidad", en: "generosity" },
  { es: "gratitud", en: "gratitude" },
  { es: "belleza", en: "beauty" },
  { es: "armonia", en: "harmony" },
  { es: "equilibrio", en: "balance" },
  { es: "unidad", en: "unity" },
  { es: "diversidad", en: "diversity" },
  { es: "creacion", en: "creation" },
  { es: "evolucion", en: "evolution" },
  { es: "naturaleza", en: "nature" },
  { es: "tecnologia", en: "technology" },
  { es: "humanidad", en: "humanity" }
];

export default VRDomo;