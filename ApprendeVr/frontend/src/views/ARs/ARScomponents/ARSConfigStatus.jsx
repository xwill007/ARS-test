import React, { useState } from 'react';
import arsConfigManager from '../../../config/ARSConfigManager';

/**
 * ARSConfigStatus
 * Componente que muestra el estado de la configuración y permite exportar/importar
 */
const ARSConfigStatus = ({ onConfigLoaded }) => {
  const [showExportImport, setShowExportImport] = useState(false);

  const exportConfig = () => {
    const config = arsConfigManager.exportConfig();
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `ars-config-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const importConfig = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importedConfig = JSON.parse(e.target.result);
          await arsConfigManager.importConfig(importedConfig);
          if (onConfigLoaded) {
            onConfigLoaded(importedConfig);
          }
          console.log('✅ Configuración importada exitosamente');
        } catch (error) {
          console.error('❌ Error importando configuración:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const resetConfig = async () => {
    const defaults = await arsConfigManager.resetToDefaults();
    if (onConfigLoaded) {
      onConfigLoaded(defaults);
    }
    console.log('🔄 Configuración reseteada a defaults');
  };

  if (!showExportImport) {
    return (
      <button
        style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          background: 'rgba(79,195,247,0.2)',
          border: '1px solid rgba(79,195,247,0.5)',
          borderRadius: 4,
          color: '#4fc3f7',
          padding: '4px 8px',
          fontSize: 10,
          cursor: 'pointer',
          zIndex: 3050
        }}
        onClick={() => setShowExportImport(true)}
        title="Opciones de configuración"
      >
        ⚙️ Config
      </button>
    );
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 10,
      right: 10,
      background: 'rgba(20,20,20,0.95)',
      border: '1px solid rgba(79,195,247,0.3)',
      borderRadius: 8,
      padding: 10,
      zIndex: 3050,
      minWidth: 200
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
      }}>
        <span style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 'bold' }}>
          Configuración AR
        </span>
        <button
          onClick={() => setShowExportImport(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ff7043',
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          ✕
        </button>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          onClick={exportConfig}
          style={{
            background: '#66bb6a',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 11,
            cursor: 'pointer'
          }}
        >
          📥 Exportar Config
        </button>
        
        <label style={{
          background: '#4fc3f7',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          padding: '4px 8px',
          fontSize: 11,
          cursor: 'pointer',
          textAlign: 'center',
          display: 'block'
        }}>
          📤 Importar Config
          <input
            type="file"
            accept=".json"
            onChange={importConfig}
            style={{ display: 'none' }}
          />
        </label>
        
        <button
          onClick={resetConfig}
          style={{
            background: '#ff7043',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 11,
            cursor: 'pointer'
          }}
        >
          🔄 Resetear
        </button>
      </div>
      
      <div style={{
        marginTop: 8,
        fontSize: 9,
        color: '#999',
        textAlign: 'center'
      }}>
        Guardado persistente en localStorage
      </div>
    </div>
  );
};

export default ARSConfigStatus;
