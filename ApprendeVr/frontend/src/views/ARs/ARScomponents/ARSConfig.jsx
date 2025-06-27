import React from 'react';
import ARSoverlayList from './ARSoverlayList';

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
  onSave
}) => (
  <>
    {/* Botón X para mostrar/ocultar menú */}
    <button
      style={{
        position: 'absolute',
        top: 12,
        left: 6,
        zIndex: 3200,
        background: 'rgba(30,30,30,0.85)',
        color: 'white',
        border: 'none',
        borderRadius: '50%',
        width: 15,
        height: 15,
        fontSize: 12,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px #000a',
      }}
      onClick={() => setShowMenu((v) => !v)}
      aria-label={showMenu ? 'Ocultar menú' : 'Mostrar menú'}
    >
      {showMenu ? '✕' : '☰'}
    </button>
    {showMenu && (
      <div style={{
        position: 'absolute',
        top: 90,
        left: 270,
        zIndex: 3100,
        background: 'rgba(30,30,30,0.95)',
        color: 'white',
        borderRadius: 8,
        padding: '10px 18px',
        fontSize: 15,
        boxShadow: '0 2px 8px #000a',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 220
      }}>
        {/* Sección de Overlays */}
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>Overlays:</span>
          <ARSoverlayList 
            selectedOverlay={selectedOverlay}
            setSelectedOverlay={setSelectedOverlay}
            overlays={overlays}
            inline={true}
          />
        </div>
        
        <hr style={{ border: '1px solid rgba(255,255,255,0.2)', margin: '10px 0' }} />
        
        {/* Controles de configuración */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ minWidth: 80 }}>Separación</span>
          <input type="range" min="0" max="100" value={arSeparation} onChange={e => setArSeparation(Number(e.target.value))} />
          <span style={{ width: 36, textAlign: 'right' }}>{arSeparation}px</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ minWidth: 80 }}>Ancho</span>
          <input type="range" min="100" max="800" value={arWidth} onChange={e => setArWidth(Number(e.target.value))} />
          <span style={{ width: 36, textAlign: 'right' }}>{arWidth}px</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ minWidth: 80 }}>Alto</span>
          <input type="range" min="100" max="800" value={arHeight} onChange={e => setArHeight(Number(e.target.value))} />
          <span style={{ width: 36, textAlign: 'right' }}>{arHeight}px</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ minWidth: 80 }}>Offset I</span>
          <input type="range" min="-200" max="200" value={offsetL} onChange={e => setOffsetL(Number(e.target.value))} />
          <span style={{ width: 36, textAlign: 'right' }}>{offsetL}px</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ minWidth: 80 }}>Offset D</span>
          <input type="range" min="-200" max="200" value={offsetR} onChange={e => setOffsetR(Number(e.target.value))} />
          <span style={{ width: 36, textAlign: 'right' }}>{offsetR}px</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ minWidth: 80 }}>Zoom</span>
          <input type="range" min="0.5" max="2" step="0.01" value={zoom} onChange={e => setZoom(Number(e.target.value))} />
          <span style={{ width: 36, textAlign: 'right' }}>{zoom.toFixed(2)}x</span>
        </div>
        {/* Botón Guardar configuración */}
        <button
          style={{
            marginTop: 10,
            background: '#1e90ff',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            padding: '6px 18px',
            fontSize: 15,
            cursor: 'pointer',
            fontWeight: 'bold',
            alignSelf: 'flex-end',
            boxShadow: '0 2px 8px #000a',
          }}
          onClick={onSave}
        >
          Guardar
        </button>
      </div>
    )}
  </>
);

export default ARSConfig;
