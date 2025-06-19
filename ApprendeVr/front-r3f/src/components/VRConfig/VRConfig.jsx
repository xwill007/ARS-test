import React, { useState } from 'react';
import VRLanguages from './VRLanguages';
import { useVRLanguage } from './VRLanguageContext';

const VRConfig = () => {
  const [open, setOpen] = useState(false);
  const { t } = useVRLanguage();

  return (
    <>
      {/* Botón flotante de configuración */}
      <button
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          zIndex: 1200,
          background: '#222',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: 48,
          height: 48,
          fontSize: 24,
          cursor: 'pointer',
          boxShadow: '0 2px 8px #0006',
        }}
        onClick={() => setOpen((v) => !v)}
        aria-label={t('menu.title')}
      >
        ⚙️
      </button>

      {/* Panel de configuración */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 80,
            right: 20,
            zIndex: 1201,
            background: '#222',
            color: 'white',
            borderRadius: 12,
            padding: '24px 32px 18px 32px',
            minWidth: 240,
            boxShadow: '0 4px 24px #000a',
            border: '2px solid #444',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 0
          }}
        >
          {/* Botón X para cerrar en la esquina superior derecha */}
          <button
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'transparent',
              color: 'white',
              border: 'none',
              fontSize: 22,
              fontWeight: 'bold',
              cursor: 'pointer',
              zIndex: 1300
            }}
            onClick={() => setOpen(false)}
            aria-label={t('close')}
          >
            ×
          </button>
          <h3 style={{marginTop:0, marginBottom:16, fontWeight:'bold', textAlign:'center'}}>
            {t('menu.title')}
          </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 12
          }}>
            <div style={{
              fontWeight:'bold',
              fontSize:15,
              letterSpacing:1,
              textTransform:'uppercase',
              color:'#90caf9',
              textAlign:'left',
              borderBottom:'1px solid #444',
              paddingBottom:4,
              marginLeft:-8,
              marginRight:0,
              flex: 1
            }}>
              {t('menu.language')}
            </div>
            <VRLanguages />
          </div>
          <div style={{height: 12}} />
          <div style={{borderTop: '1px solid #444', margin: '12px -32px 0 -32px'}} />
        </div>
      )}
    </>
  );
};

export default VRConfig;
