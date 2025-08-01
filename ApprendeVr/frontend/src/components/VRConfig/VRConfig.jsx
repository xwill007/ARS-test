import React, { useState } from 'react';
import VRLanguages from './VRLanguages';
import { useVRLanguage } from './VRLanguageContext';
import { useVRTheme } from './VRThemeContext';

const VRConfig = ({ 
  showVRDisplay, 
  setShowVRDisplay, 
  wordFile = "cone_words.json", 
  setWordFile = () => {}, 
  fontName = "Roboto", 
  setFontName = () => {}, 
  wordFiles = [], 
  fontOptions = [],
  onNavigateTo
}) => {
  const [open, setOpen] = useState(false);
  const { t } = useVRLanguage();
  const { themeName, setThemeName, themeList } = useVRTheme();

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
            minWidth: 260,
            boxShadow: '0 4px 24px #000a',
            border: '2px solid #444',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 0
          }}
        >
          {/* Selector de archivo de palabras */}
          <div style={{marginTop: 18, textAlign: 'center'}}>
            <label style={{ color: '#90caf9', fontWeight: 'bold', fontSize: 14 }}>
              {t('menu.wordFile')}:
              <select
                value={wordFile}
                onChange={e => setWordFile(e.target.value)}
                style={{ marginLeft: 8, fontSize: 14, borderRadius: 4, padding: '2px 8px' }}
              >
                {(wordFiles || []).map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </label>
          </div>
          {/* Selector de fuente MSDF */}
          <div style={{marginTop: 12, textAlign: 'center'}}>
            <label style={{ color: '#90caf9', fontWeight: 'bold', fontSize: 14 }}>
              {t('menu.msdfFont')}:
              <select
                value={fontName}
                onChange={e => setFontName(e.target.value)}
                style={{ marginLeft: 8, fontSize: 14, borderRadius: 4, padding: '2px 8px' }}
              >
                {(fontOptions || []).map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </label>
          </div>
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
          {/* Submenú de Theme dinámico */}
          <div style={{borderTop: '1px solid #444', margin: '12px -32px 0 -32px'}} />
          <div style={{marginTop: 18, textAlign: 'center'}}>
            <label style={{ color: '#90caf9', fontWeight: 'bold', fontSize: 14 }}>
              {t('menu.theme')}
              <select
                value={themeName}
                onChange={e => setThemeName(e.target.value)}
                style={{ marginLeft: 8, fontSize: 14, borderRadius: 4, padding: '2px 8px' }}
              >
                {themeList.map(key => {
                  // Intenta traducir, si no existe, muestra nombre legible
                  let label = t(`menu.${key}`);
                  if (!label || label === `menu.${key}`) {
                    label = key.replace(/^theme/, '').replace(/([A-Z])/g, ' $1').trim();
                    label = label.charAt(0).toUpperCase() + label.slice(1);
                  }
                  return <option key={key} value={key}>{label}</option>;
                })}
              </select>
            </label>
          </div>
          <div style={{height: 12}} />
          <div style={{borderTop: '1px solid #444', margin: '12px -32px 0 -32px'}} />
          <div style={{marginTop: 18, textAlign: 'center'}}>
            <label style={{ color: '#90caf9', fontWeight: 'bold', fontSize: 14 }}>
              {t('menu.showVRDisplay')}
              <input
                type="checkbox"
                checked={showVRDisplay}
                onChange={e => setShowVRDisplay(e.target.checked)}
                style={{ marginLeft: 8 }}
              />
            </label>
          </div>
          
          {/* Sección de Navegación */}
          <div style={{height: 12}} />
          <div style={{borderTop: '1px solid #444', margin: '12px -32px 0 -32px'}} />
          <div style={{marginTop: 18}}>
            <div style={{ 
              color: '#90caf9', 
              fontWeight: 'bold', 
              fontSize: 14, 
              textAlign: 'center',
              marginBottom: 12
            }}>
              {t('menu.navigation')}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              marginBottom: 8
            }}>
              <button
                onClick={() => onNavigateTo && onNavigateTo('mobile')}
                style={{
                  background: 'linear-gradient(135deg, #547a54, #4a6b4a)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 12px',
                  fontSize: 11,
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                VR-R3F
              </button>
              <button
                onClick={() => onNavigateTo && onNavigateTo('aframe')}
                style={{
                  background: 'linear-gradient(135deg, #547a54, #4a6b4a)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 12px',
                  fontSize: 11,
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                A-FRAME
              </button>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8
            }}>
              <button
                onClick={() => onNavigateTo && onNavigateTo('ar-stereo')}
                style={{
                  background: 'linear-gradient(135deg, #547a54, #4a6b4a)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 12px',
                  fontSize: 11,
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                VR-AR STEREO
              </button>
              <button
                onClick={() => onNavigateTo && onNavigateTo('aframe-voice')}
                style={{
                  background: 'linear-gradient(135deg, #547a54, #4a6b4a)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 12px',
                  fontSize: 11,
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                A-FRAME AR VOZ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VRConfig;
