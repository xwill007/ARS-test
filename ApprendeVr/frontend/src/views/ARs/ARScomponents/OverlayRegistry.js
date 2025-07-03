/**
 * OverlayRegistry - Sistema de registro de overlays basado en principios SOLID
 * 
 * Principios aplicados:
 * - Single Responsibility: Solo se encarga del registro de overlays
 * - Open/Closed: Abierto para extensión, cerrado para modificación
 * - Dependency Inversion: Depende de abstracciones, no de implementaciones concretas
 */

class OverlayRegistry {
  constructor() {
    this.overlays = new Map();
  }

  /**
   * Registra un nuevo overlay
   * @param {string} key - Clave única del overlay
   * @param {Object} overlayConfig - Configuración del overlay
   * @param {React.Component} overlayConfig.component - Componente React
   * @param {string} overlayConfig.type - Tipo: 'html' | 'r3f'
   * @param {string} overlayConfig.label - Etiqueta para mostrar
   * @param {string} overlayConfig.description - Descripción opcional
   * @param {Object} overlayConfig.defaultProps - Props por defecto
   * @param {string} overlayConfig.category - Categoría opcional
   */
  register(key, overlayConfig) {
    if (!key || typeof key !== 'string') {
      throw new Error('Overlay key must be a non-empty string');
    }

    if (!overlayConfig.component) {
      throw new Error('Overlay must have a component');
    }

    if (!['html', 'r3f'].includes(overlayConfig.type)) {
      throw new Error('Overlay type must be "html" or "r3f"');
    }

    const config = {
      component: overlayConfig.component,
      type: overlayConfig.type,
      label: overlayConfig.label || key,
      description: overlayConfig.description || '',
      defaultProps: overlayConfig.defaultProps || {},
      category: overlayConfig.category || 'general',
      ...overlayConfig
    };

    this.overlays.set(key, config);
    console.log(`✅ Overlay registered: ${key} (${config.type})`);
  }

  /**
   * Obtiene la configuración de un overlay
   */
  get(key) {
    return this.overlays.get(key);
  }

  /**
   * Obtiene todos los overlays registrados
   */
  getAll() {
    return Object.fromEntries(this.overlays);
  }

  /**
   * Obtiene overlays por tipo
   */
  getByType(type) {
    const filtered = {};
    for (const [key, config] of this.overlays) {
      if (config.type === type) {
        filtered[key] = config;
      }
    }
    return filtered;
  }

  /**
   * Obtiene overlays por categoría
   */
  getByCategory(category) {
    const filtered = {};
    for (const [key, config] of this.overlays) {
      if (config.category === category) {
        filtered[key] = config;
      }
    }
    return filtered;
  }

  /**
   * Verifica si un overlay está registrado
   */
  has(key) {
    return this.overlays.has(key);
  }

  /**
   * Obtiene las claves de todos los overlays
   */
  getKeys() {
    return Array.from(this.overlays.keys());
  }

  /**
   * Obtiene solo la información de configuración (sin componentes)
   */
  getMetadata() {
    const metadata = {};
    for (const [key, config] of this.overlays) {
      metadata[key] = {
        type: config.type,
        label: config.label,
        description: config.description,
        category: config.category
      };
    }
    return metadata;
  }

  /**
   * Limpia todos los overlays registrados
   */
  clear() {
    this.overlays.clear();
  }

  /**
   * Elimina un overlay específico
   */
  unregister(key) {
    return this.overlays.delete(key);
  }
}

// Instancia singleton del registro
const overlayRegistry = new OverlayRegistry();

export default overlayRegistry;
