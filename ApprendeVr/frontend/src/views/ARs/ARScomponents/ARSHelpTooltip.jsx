import React, { useState } from 'react';
import { useVRLanguage } from '../../../components/VRConfig/VRLanguageContext';

/**
 * ARSHelpTooltip
 * Componente de ayuda que muestra información sobre los controles AR estereoscópicos
 */
const ARSHelpTooltip = ({ show, onClose }) => {
  const { t } = useVRLanguage();
  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.8)',
      zIndex: 5000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(30,30,30,0.98), rgba(40,40,40,0.98))',
        color: 'white',
        borderRadius: 16,
        padding: '24px 28px',
        maxWidth: 500,
        width: '100%',
        maxHeight: '80vh',
        overflowY: 'auto',
        border: '1px solid rgba(79,195,247,0.3)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
      }}>
        {/* Encabezado */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          borderBottom: '1px solid rgba(79,195,247,0.2)',
          paddingBottom: 12
        }}>
          <h3 style={{
            margin: 0,
            color: '#4fc3f7',
            fontSize: 18,
            fontWeight: 'bold'
          }}>
            {t('help.title')}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ff7043',
              fontSize: 20,
              cursor: 'pointer',
              padding: 4
            }}
          >
            ✕
          </button>
        </div>

        {/* Contenido de ayuda */}
        <div style={{ fontSize: 14, lineHeight: 1.6 }}>
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ color: '#66bb6a', margin: '0 0 8px 0' }}>{t('help.separation')}</h4>
            <p style={{ margin: 0, color: '#ccc' }}>
              {t('help.separationDesc')}
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{ color: '#66bb6a', margin: '0 0 8px 0' }}>{t('help.widthHeight')}</h4>
            <p style={{ margin: 0, color: '#ccc' }}>
              {t('help.widthHeightDesc')}
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{ color: '#66bb6a', margin: '0 0 8px 0' }}>{t('help.offset')}</h4>
            <p style={{ margin: 0, color: '#ccc' }}>
              {t('help.offsetDesc')}
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{ color: '#66bb6a', margin: '0 0 8px 0' }}>{t('help.zoom')}</h4>
            <p style={{ margin: 0, color: '#ccc' }}>
              {t('help.zoomDesc')}
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h4 style={{ color: '#4fc3f7', margin: '0 0 8px 0' }}>{t('help.presets')}</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ 
                background: '#4fc3f7', 
                color: 'white', 
                padding: '2px 8px', 
                borderRadius: 4, 
                fontSize: 12 
              }}>{t('arsConfig.presets.mobile')}</span>
              <span style={{ 
                background: '#66bb6a', 
                color: 'white', 
                padding: '2px 8px', 
                borderRadius: 4, 
                fontSize: 12 
              }}>{t('arsConfig.presets.desktop')}</span>
              <span style={{ 
                background: '#ff7043', 
                color: 'white', 
                padding: '2px 8px', 
                borderRadius: 4, 
                fontSize: 12 
              }}>{t('arsConfig.presets.vr')}</span>
            </div>
            <p style={{ margin: '8px 0 0 0', color: '#ccc', fontSize: 13 }}>
              {t('help.presetsDesc')}
            </p>
          </div>

          <div style={{
            background: 'rgba(79,195,247,0.1)',
            border: '1px solid rgba(79,195,247,0.3)',
            borderRadius: 8,
            padding: 12,
            marginTop: 16
          }}>
            <h4 style={{ color: '#4fc3f7', margin: '0 0 8px 0', fontSize: 14 }}>{t('help.tips.title')}</h4>
            <ul style={{ margin: 0, paddingLeft: 16, color: '#ccc', fontSize: 13 }}>
              <li>{t('help.tips.1')}</li>
              <li>{t('help.tips.2')}</li>
              <li>{t('help.tips.3')}</li>
              <li>{t('help.tips.4')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ARSHelpTooltip;
