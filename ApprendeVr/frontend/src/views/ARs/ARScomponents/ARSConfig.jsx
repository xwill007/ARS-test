import React from 'react';
import ARSoverlayList from './ARSoverlayList';
import ARSHelpTooltip from './ARSHelpTooltip';
import arsConfigManager from '../../../config/ARSConfigManager';

/**
 * ARSConfig
 * Menú de configuración para la vista ARS (zoom, separación, ancho, alto, offset) + lista de overlays.
 * Props:
 *  - arSeparation, setArSeparation
 *  - arWidth, setArWidth
 *  - arHeight, setArHeight
 *  - offsetL, setOffsetL
 *  - offsetR, setOffsetR
 *  - zoom, setZoom
 *  - showMenu, setShowMenu
 *  - selectedOverlay, setSelectedOverlay
 *  - overlays
 *  - onSave: función para guardar en localStorage
 *  - position: objeto con propiedades de posición { button: {}, menu: {} }
 */
const ARSConfig = ({
  arSeparation, setArSeparation,
  arWidth, setArWidth,
  arHeight, setArHeight,
  offsetL, setOffsetL,
  offsetR, setOffsetR,
  zoom, setZoom,
  showMenu, setShowMenu,
  selectedOverlay, setSelectedOverlay,
  overlays,
  onSave,
  position = {
    button: { top: 12, left: 6 },
    menu: { top: 90, left: 270 }
  }
}) => {
  const [showHelp, setShowHelp] = React.useState(false);

  // Función para aplicar presets usando el manager
  const applyPreset = async (presetName) => {
    try {
      const preset = await arsConfigManager.applyPreset(presetName);
      // Actualizar los estados locales
      setArSeparation(preset.arSeparation);
      setArWidth(preset.arWidth);
      setArHeight(preset.arHeight);
      setOffsetL(preset.offsetL);
      setOffsetR(preset.offsetR);
      setZoom(preset.zoom);
      console.log(`✅ Preset ${presetName} aplicado:`, preset);
    } catch (error) {
      console.error(`❌ Error aplicando preset ${presetName}:`, error);
    }
  };
  // Estilos por defecto del botón
  const defaultButtonStyle = {
    position: 'absolute',
    top: position.button.top || 12,
    left: position.button.left || 6,
    right: position.button.right,
    bottom: position.button.bottom,
    zIndex: 3200,
    background: showMenu ? 'rgba(79,195,247,0.9)' : 'rgba(30,30,30,0.85)',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: 18,
    height: 18,
    fontSize: 14,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px #000a',
    transition: 'all 0.3s ease',
  };

  // Estilos por defecto del menú
  const defaultMenuStyle = {
    position: 'absolute',
    top: position.menu.top || 90,
    left: position.menu.left || 270,
    right: position.menu.right,
    bottom: position.menu.bottom,
    zIndex: 3100,
    background: 'rgba(20,20,20,0.96)',
    color: 'white',
    borderRadius: 12,
    padding: '12px 20px',
    fontSize: 14,
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minWidth: 280,
    border: '1px solid rgba(79,195,247,0.3)'
  };

  return (
    <>
      {/* Botón X para mostrar/ocultar menú */}
      <button
        style={defaultButtonStyle}
        onClick={() => setShowMenu((v) => !v)}
        aria-label={showMenu ? 'Ocultar menú' : 'Mostrar menú'}
      >
        {showMenu ? '✕' : '☰'}
      </button>
      {showMenu && (
        <div style={defaultMenuStyle}>
          {/* Sección de Overlays

          <div style={{ marginBottom: 10 }}>
            <span style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>Overlays:</span>
            <ARSoverlayList 
              selectedOverlay={selectedOverlay}
              setSelectedOverlay={setSelectedOverlay}
              overlays={overlays}
              inline={true}
            />
          </div>
          */}
          
          <hr style={{ border: '1px solid rgba(255,255,255,0.2)', margin: '10px 0' }} />
          
          {/* Título de sección con botón de ayuda */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: 8 
          }}>
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 16, color: '#4fc3f7' }}>
              Configuración Estereoscópica AR
            </div>
            <button
              onClick={() => setShowHelp(true)}
              style={{
                background: 'transparent',
                border: '1px solid rgba(79,195,247,0.5)',
                borderRadius: '50%',
                width: 20,
                height: 20,
                color: '#4fc3f7',
                cursor: 'pointer',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Ayuda"
            >
              ?
            </button>
          </div>
          
          {/* Controles de configuración mejorados */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: 90, fontSize: 13 }}>📐 Separación</span>
            <input 
              type="range" 
              min="0" 
              max="120" 
              step="2"
              value={arSeparation} 
              onChange={e => setArSeparation(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#4fc3f7' }}
            />
            <span style={{ width: 40, textAlign: 'right', fontSize: 12 }}>{arSeparation}px</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: 90, fontSize: 13 }}>📏 Ancho</span>
            <input 
              type="range" 
              min="200" 
              max="600" 
              step="10"
              value={arWidth} 
              onChange={e => setArWidth(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#4fc3f7' }}
            />
            <span style={{ width: 40, textAlign: 'right', fontSize: 12 }}>{arWidth}px</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: 90, fontSize: 13 }}>📐 Alto</span>
            <input 
              type="range" 
              min="200" 
              max="700" 
              step="10"
              value={arHeight} 
              onChange={e => setArHeight(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#4fc3f7' }}
            />
            <span style={{ width: 40, textAlign: 'right', fontSize: 12 }}>{arHeight}px</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: 90, fontSize: 13 }}>⬅️ Offset I</span>
            <input 
              type="range" 
              min="-300" 
              max="300" 
              step="5"
              value={offsetL} 
              onChange={e => setOffsetL(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#ff7043' }}
            />
            <span style={{ width: 40, textAlign: 'right', fontSize: 12 }}>{offsetL}px</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: 90, fontSize: 13 }}>➡️ Offset D</span>
            <input 
              type="range" 
              min="-300" 
              max="300" 
              step="5"
              value={offsetR} 
              onChange={e => setOffsetR(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#ff7043' }}
            />
            <span style={{ width: 40, textAlign: 'right', fontSize: 12 }}>{offsetR}px</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: 90, fontSize: 13 }}>🔍 Zoom</span>
            <input 
              type="range" 
              min="0.3" 
              max="3" 
              step="0.05" 
              value={zoom} 
              onChange={e => setZoom(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#66bb6a' }}
            />
            <span style={{ width: 40, textAlign: 'right', fontSize: 12 }}>{zoom.toFixed(2)}x</span>
          </div>
          
          {/* Botones de presets mejorados */}
          <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              style={{
                background: '#4fc3f7',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: 11,
                cursor: 'pointer',
                flex: 1,
                minWidth: 60
              }}
              onClick={() => applyPreset('mobile')}
            >
              📱 Móvil
            </button>
            <button
              style={{
                background: '#66bb6a',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: 11,
                cursor: 'pointer',
                flex: 1,
                minWidth: 60
              }}
              onClick={() => applyPreset('desktop')}
            >
              💻 Desktop
            </button>
            <button
              style={{
                background: '#ff7043',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: 11,
                cursor: 'pointer',
                flex: 1,
                minWidth: 60
              }}
              onClick={() => applyPreset('vr')}
            >
              🥽 VR
            </button>
          </div>
          {/* Botón Guardar configuración mejorado */}
          <button
            style={{
              marginTop: 15,
              background: 'linear-gradient(135deg, #4fc3f7, #29b6f6)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '8px 20px',
              fontSize: 14,
              cursor: 'pointer',
              fontWeight: 'bold',
              alignSelf: 'stretch',
              boxShadow: '0 2px 8px rgba(79,195,247,0.3)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
            onClick={() => {
              onSave();
              // Feedback visual
              const button = event.target;
              const originalText = button.innerHTML;
              button.innerHTML = '✓ Guardado';
              button.style.background = 'linear-gradient(135deg, #66bb6a, #4caf50)';
              setTimeout(() => {
                button.innerHTML = originalText;
                button.style.background = 'linear-gradient(135deg, #4fc3f7, #29b6f6)';
              }, 1500);
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #29b6f6, #1e88e5)';
              e.target.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #4fc3f7, #29b6f6)';
              e.target.style.transform = 'scale(1)';
            }}
          >
            💾 Guardar Configuración
          </button>
        </div>
      )}
      
      {/* Componente de ayuda */}
      <ARSHelpTooltip 
        show={showHelp} 
        onClose={() => setShowHelp(false)} 
      />
    </>
  );
};

export default ARSConfig;
