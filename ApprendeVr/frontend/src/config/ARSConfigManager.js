/**
 * ARSConfigManager
 * Maneja la carga y guardado de configuraciones AR en archivo JSON
 */

import configArs from './config_Ars.json';

class ARSConfigManager {
  constructor() {
    this.configPath = '/src/config/config_Ars.json';
    this.config = configArs;
  }

  /**
   * Detecta el tipo de dispositivo
   */
  detectDeviceType() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
    const isTablet = /ipad|android(?!.*mobile)/.test(userAgent);
    
    if (isMobile && !isTablet) return 'mobile';
    if (isTablet) return 'tablet';
    return 'desktop';
  }

  /**
   * Obtiene los defaults adaptativos por dispositivo
   */
  getDeviceDefaults() {
    const deviceType = this.detectDeviceType();
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    const baseConfig = this.config.deviceProfiles[deviceType] || this.config.deviceProfiles.desktop;
    
    // Adaptar a las dimensiones de pantalla actuales
    return {
      ...baseConfig,
      arSeparation: Math.min(baseConfig.arSeparation, screenWidth * 0.08),
      arWidth: Math.min(baseConfig.arWidth, screenWidth * 0.4),
      arHeight: Math.min(baseConfig.arHeight, screenHeight * 0.7)
    };
  }

  /**
   * Carga la configuración inicial
   */
  loadConfig(defaults = {}) {
    try {
      // Defaults con resolución de cámara y overlays
      const defaultsWithCamera = {
        cameraResolution: '720p',
        selectedOverlays: ['vrConeOverlay'],
        ...defaults
      };

      console.log('🔍 Cargando configuración AR con defaults:', defaultsWithCamera);

      // Primero intentar cargar configuración persistente
      const persistedConfig = this.loadPersistedConfig();
      if (persistedConfig) {
        console.log('📂 Configuración persistente encontrada:', persistedConfig);
        const deviceDefaults = this.getDeviceDefaults();
        const finalConfig = { ...defaultsWithCamera, ...deviceDefaults, ...persistedConfig };
        console.log('✅ Configuración final cargada:', finalConfig);
        return finalConfig;
      }

      // Si no hay configuración persistente, intentar localStorage legacy
      const localStored = localStorage.getItem('arsconfig-user');
      if (localStored) {
        const parsed = JSON.parse(localStored);
        console.log('📂 Configuración legacy encontrada:', parsed);
        // Migrar a nuevo sistema
        this.saveConfig(parsed);
        localStorage.removeItem('arsconfig-user'); // Limpiar old key
        return { ...defaultsWithCamera, ...this.getDeviceDefaults(), ...parsed };
      }

      // Usar configuración del archivo JSON por defecto
      const userConfig = this.config.userConfig;
      const deviceDefaults = this.getDeviceDefaults();
      
      console.log('📄 Usando configuración por defecto del archivo JSON');
      console.log('👤 UserConfig:', userConfig);
      console.log('📱 DeviceDefaults:', deviceDefaults);
      
      const finalConfig = {
        ...defaultsWithCamera,
        ...deviceDefaults,
        ...userConfig
      };
      
      console.log('✅ Configuración final (defaults):', finalConfig);
      return finalConfig;
    } catch (error) {
      console.warn('Error loading AR config:', error);
      return { 
        ...defaults, 
        ...this.getDeviceDefaults(),
        cameraResolution: '720p',
        selectedOverlays: ['vrConeOverlay']
      };
    }
  }

  /**
   * Guarda la configuración (en desarrollo usamos localStorage como persistencia)
   */
  async saveConfig(newConfig) {
    try {
      // Actualizar la configuración en memoria
      this.config.userConfig = {
        ...this.config.userConfig,
        ...newConfig,
        deviceType: this.detectDeviceType(),
        customProfile: true
      };

      this.config.lastUpdated = new Date().toISOString();

      // Guardar en localStorage como persistencia real
      localStorage.setItem('arsconfig-persistent', JSON.stringify(this.config));

      console.log('✅ Configuración AR guardada en localStorage persistente:', newConfig);
      console.log('📁 Configuración completa:', this.config);
      return true;
    } catch (error) {
      console.error('❌ Error guardando configuración AR:', error);
      return false;
    }
  }

  /**
   * Carga la configuración desde localStorage persistente
   */
  loadPersistedConfig() {
    try {
      const stored = localStorage.getItem('arsconfig-persistent');
      console.log('🔍 Buscando configuración persistente en localStorage...');
      if (stored) {
        const parsedConfig = JSON.parse(stored);
        console.log('📂 Configuración persistente encontrada en localStorage:', parsedConfig);
        // Actualizar la configuración en memoria
        this.config = { ...this.config, ...parsedConfig };
        console.log('✅ UserConfig extraído:', parsedConfig.userConfig);
        return parsedConfig.userConfig;
      } else {
        console.log('❌ No se encontró configuración persistente en localStorage');
      }
    } catch (error) {
      console.warn('Error cargando configuración persistente:', error);
    }
    return null;
  }

  /**
   * Obtiene un preset específico
   */
  getPreset(presetName) {
    return this.config.presets[presetName] || this.config.presets.mobile;
  }

  /**
   * Aplica un preset
   */
  async applyPreset(presetName) {
    const preset = this.getPreset(presetName);
    await this.saveConfig(preset);
    return preset;
  }

  /**
   * Resetea a configuración por defecto del dispositivo
   */
  async resetToDefaults() {
    const defaults = this.getDeviceDefaults();
    await this.saveConfig(defaults);
    return defaults;
  }

  /**
   * Exporta la configuración actual
   */
  exportConfig() {
    return {
      ...this.config.userConfig,
      exportDate: new Date().toISOString(),
      deviceType: this.detectDeviceType()
    };
  }

  /**
   * Importa una configuración
   */
  async importConfig(importedConfig) {
    if (importedConfig && typeof importedConfig === 'object') {
      await this.saveConfig(importedConfig);
      return importedConfig;
    }
    throw new Error('Configuración inválida para importar');
  }

  /**
   * Guarda solo la lista de overlays seleccionados
   */
  async saveSelectedOverlays(selectedOverlays) {
    try {
      const currentConfig = this.loadPersistedConfig() || {};
      const newConfig = {
        ...currentConfig,
        selectedOverlays
      };
      
      return await this.saveConfig(newConfig);
    } catch (error) {
      console.error('❌ Error guardando overlays seleccionados:', error);
      return false;
    }
  }

  /**
   * Carga solo la lista de overlays seleccionados
   */
  loadSelectedOverlays() {
    try {
      const config = this.loadPersistedConfig();
      if (config && config.selectedOverlays) {
        console.log('📂 Overlays seleccionados cargados:', config.selectedOverlays);
        return config.selectedOverlays;
      }
      
      // Fallback a configuración por defecto
      const defaultOverlays = this.config.userConfig.selectedOverlays || ['vrConeOverlay'];
      console.log('📄 Usando overlays por defecto:', defaultOverlays);
      return defaultOverlays;
    } catch (error) {
      console.warn('Error cargando overlays seleccionados:', error);
      return ['vrConeOverlay'];
    }
  }

  /**
   * Actualiza la configuración con nuevos overlays seleccionados
   */
  async updateOverlaySelection(selectedOverlays) {
    try {
      // Cargar configuración actual
      const currentConfig = this.loadPersistedConfig() || this.config.userConfig || {};
      
      // Actualizar solo los overlays
      const updatedConfig = {
        ...currentConfig,
        selectedOverlays,
        lastUpdated: new Date().toISOString()
      };
      
      console.log('🔄 Actualizando selección de overlays:', selectedOverlays);
      return await this.saveConfig(updatedConfig);
    } catch (error) {
      console.error('❌ Error actualizando selección de overlays:', error);
      return false;
    }
  }
}

// Singleton instance
const arsConfigManager = new ARSConfigManager();

export default arsConfigManager;
