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
      // Primero intentar cargar configuración persistente
      const persistedConfig = this.loadPersistedConfig();
      if (persistedConfig) {
        const deviceDefaults = this.getDeviceDefaults();
        return { ...defaults, ...deviceDefaults, ...persistedConfig };
      }

      // Si no hay configuración persistente, intentar localStorage legacy
      const localStored = localStorage.getItem('arsconfig-user');
      if (localStored) {
        const parsed = JSON.parse(localStored);
        // Migrar a nuevo sistema
        this.saveConfig(parsed);
        localStorage.removeItem('arsconfig-user'); // Limpiar old key
        return { ...defaults, ...this.getDeviceDefaults(), ...parsed };
      }

      // Usar configuración del archivo JSON por defecto
      const userConfig = this.config.userConfig;
      const deviceDefaults = this.getDeviceDefaults();
      
      return {
        ...defaults,
        ...deviceDefaults,
        ...userConfig
      };
    } catch (error) {
      console.warn('Error loading AR config:', error);
      return { ...defaults, ...this.getDeviceDefaults() };
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
      if (stored) {
        const parsedConfig = JSON.parse(stored);
        // Actualizar la configuración en memoria
        this.config = { ...this.config, ...parsedConfig };
        return parsedConfig.userConfig;
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
}

// Singleton instance
const arsConfigManager = new ARSConfigManager();

export default arsConfigManager;
