import configData from '../../../config/config_Ars.js';

/**
 * ConfigurableOverlayManager - Administrador de configuración para overlays
 * Permite cargar, guardar y gestionar configuraciones de overlays
 */
class ConfigurableOverlayManager {
  constructor() {
    this.config = { ...configData };
    this.userOverlaySettings = this.loadUserSettings();
    this.listeners = new Map(); // Para notificar cambios
  }

  /**
   * Suscribirse a cambios de configuración
   */
  subscribe(overlayId, callback) {
    if (!this.listeners.has(overlayId)) {
      this.listeners.set(overlayId, new Set());
    }
    this.listeners.get(overlayId).add(callback);
    
    // Retornar función para desuscribirse
    return () => {
      const callbacks = this.listeners.get(overlayId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(overlayId);
        }
      }
    };
  }

  /**
   * Notificar cambios a los suscriptores
   */
  notifyListeners(overlayId, newConfig) {
    const callbacks = this.listeners.get(overlayId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(newConfig);
        } catch (error) {
          console.error('Error in overlay config listener:', error);
        }
      });
    }
  }

  /**
   * Carga configuraciones de usuario desde localStorage
   */
  loadUserSettings() {
    try {
      const saved = localStorage.getItem('ars-overlay-settings');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.warn('Error loading user overlay settings:', error);
      return {};
    }
  }

  /**
   * Guarda configuraciones de usuario en localStorage
   */
  saveUserSettings(settings) {
    try {
      this.userOverlaySettings = { ...this.userOverlaySettings, ...settings };
      localStorage.setItem('ars-overlay-settings', JSON.stringify(this.userOverlaySettings));
      return true;
    } catch (error) {
      console.error('Error saving user overlay settings:', error);
      return false;
    }
  }

  /**
   * Obtiene la configuración completa para un overlay específico
   */
  getOverlayConfig(overlayId) {
    const baseConfig = this.config.overlays?.[overlayId] || {};
    const userConfig = this.userOverlaySettings[overlayId] || {};
    
    return this.mergeConfigs(baseConfig, userConfig);
  }

  /**
   * Actualiza la configuración de un overlay específico
   */
  updateOverlayConfig(overlayId, newConfig) {
    const currentUserConfig = this.userOverlaySettings[overlayId] || {};
    const updatedConfig = { ...currentUserConfig, ...newConfig };
    
    const success = this.saveUserSettings({
      [overlayId]: updatedConfig
    });
    
    if (success) {
      const fullConfig = this.getOverlayConfig(overlayId);
      this.notifyListeners(overlayId, fullConfig);
    }
    
    return success;
  }

  /**
   * Actualiza la posición de un elemento específico en un overlay
   */
  updateOverlayPosition(overlayId, elementKey, position) {
    const currentConfig = this.getOverlayConfig(overlayId);
    const updatedConfig = {
      ...currentConfig,
      [elementKey]: {
        ...currentConfig[elementKey],
        position: position
      }
    };
    
    const success = this.updateOverlayConfig(overlayId, updatedConfig);
    return success;
  }

  /**
   * Obtiene la posición de un elemento específico
   */
  getElementPosition(overlayId, elementKey, defaultPosition = [0, 0, 0]) {
    const config = this.getOverlayConfig(overlayId);
    return config[elementKey]?.position || defaultPosition;
  }

  /**
   * Obtiene todas las configuraciones de overlays disponibles
   */
  getAllOverlayConfigs() {
    const overlayIds = Object.keys(this.config.overlays || {});
    const configs = {};
    
    overlayIds.forEach(id => {
      configs[id] = this.getOverlayConfig(id);
    });
    
    return configs;
  }

  /**
   * Reinicia la configuración de un overlay a los valores por defecto
   */
  resetOverlayConfig(overlayId) {
    console.log(`Resetting overlay config for: ${overlayId}`);
    
    // Eliminar configuración de usuario específica
    if (this.userOverlaySettings[overlayId]) {
      delete this.userOverlaySettings[overlayId];
      this.saveUserSettings(this.userOverlaySettings);
    }
    
    // Eliminar de localStorage también
    const key = `overlayConfig_${overlayId}`;
    localStorage.removeItem(key);
    
    // Obtener configuración base limpia
    const baseConfig = this.config.overlays?.[overlayId] || {};
    
    // Notificar a los listeners
    this.notifyListeners(overlayId, baseConfig);
    
    console.log(`Reset complete for ${overlayId}:`, baseConfig);
    return baseConfig;
  }

  /**
   * Fuerza la recarga de la configuración desde el archivo base
   */
  forceReloadConfig() {
    console.log('Force reloading overlay configuration...');
    
    // Recargar configuración base
    import('../../../config/config_Ars.js').then((module) => {
      this.config = { ...module.default };
      console.log('Base config reloaded:', this.config);
      
      // Notificar a todos los listeners
      this.listeners.forEach((callbacks, overlayId) => {
        const newConfig = this.getOverlayConfig(overlayId);
        this.notifyListeners(overlayId, newConfig);
      });
    }).catch(error => {
      console.error('Error reloading config:', error);
    });
  }

  /**
   * Combina configuraciones base con configuraciones de usuario
   */
  mergeConfigs(baseConfig, userConfig) {
    const merged = { ...baseConfig };
    
    Object.keys(userConfig).forEach(key => {
      if (typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key])) {
        merged[key] = {
          ...merged[key],
          ...userConfig[key]
        };
      } else {
        merged[key] = userConfig[key];
      }
    });
    
    return merged;
  }

  /**
   * Exporta todas las configuraciones de usuario
   */
  exportUserSettings() {
    return {
      timestamp: new Date().toISOString(),
      version: this.config.version,
      settings: this.userOverlaySettings
    };
  }

  /**
   * Importa configuraciones de usuario
   */
  importUserSettings(exportedSettings) {
    try {
      if (exportedSettings.settings) {
        this.userOverlaySettings = exportedSettings.settings;
        localStorage.setItem('ars-overlay-settings', JSON.stringify(this.userOverlaySettings));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error importing user settings:', error);
      return false;
    }
  }
}

// Crear instancia singleton
const configurableOverlayManager = new ConfigurableOverlayManager();

export default configurableOverlayManager;
