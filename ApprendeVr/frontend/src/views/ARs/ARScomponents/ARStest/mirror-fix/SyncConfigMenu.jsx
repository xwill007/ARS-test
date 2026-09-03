import React, { useState } from 'react';

/**
 * SyncConfigMenu — Requerimiento 002, menú de configuración para la vista "AR-SYNC"
 * (SyncStereoTestView.jsx), con el mismo look & feel que el menú ⚙️ de ARSConfig.jsx (producción,
 * usado por la vista "AR-TEST" de espejo por captura) pero simplificado: sin la sección
 * "Optimización Estereoscópica" (Espejo D, Silenciar D, etc.), porque en la arquitectura de
 * sincronización por estado ambos paneles son siempre instancias reales — no hay "panel espejo"
 * que optimizar.
 *
 * Dos pestañas:
 *  - Configuración: separación entre paneles, ancho, alto de cada uno.
 *  - Overlays: selección MÚLTIPLE (checkboxes, igual que el menú "Overlays" real de producción —
 *    OverlayDropdownMenu con multiSelect={true}) de qué overlays se apilan en ambos paneles. Ver
 *    CameraOverlaySync.jsx, VRLocalVideoOverlaySync.jsx y VRConeOverlaySync.jsx.
 *
 * Componente de prueba aislado, no se usa desde ningún archivo de producción.
 */
const menuStyle = {
  position: 'fixed',
  top: 16,
  left: 16,
  zIndex: 4100,
  background: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: 10,
  color: 'white',
  width: 260,
  boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
  fontFamily: 'sans-serif',
};

const tabBarStyle = { display: 'flex', borderBottom: '1px solid #333' };

const tabStyle = (active) => ({
  flex: 1,
  padding: '10px 8px',
  textAlign: 'center',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 'bold',
  background: active ? '#222' : 'transparent',
  color: active ? '#4FC3F7' : '#aaa',
  borderBottom: active ? '2px solid #4FC3F7' : '2px solid transparent',
});

const bodyStyle = { padding: 14 };

const rowStyle = { marginBottom: 12 };

const labelStyle = { display: 'block', fontSize: 12, color: '#ccc', marginBottom: 4 };

const overlayOptionStyle = (active) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 10px',
  borderRadius: 6,
  marginBottom: 6,
  cursor: 'pointer',
  background: active ? 'rgba(79,195,247,0.15)' : 'transparent',
  border: active ? '1px solid #4FC3F7' : '1px solid transparent',
});

export const OVERLAY_OPTIONS = [
  { key: 'camera', label: 'Cámara (fondo, sin sincronizar — cada panel lee su propia cámara en vivo)' },
  { key: 'video', label: 'Video local (play/pause/seek + voz)' },
  { key: 'cone', label: 'Cono de palabras' },
];

const SyncConfigMenu = ({
  onClose,
  separation, onSeparationChange,
  width, onWidthChange,
  height, onHeightChange,
  selectedOverlays, onToggleOverlay,
}) => {
  const [tab, setTab] = useState('config');

  return (
    <div style={menuStyle}>
      <div style={tabBarStyle}>
        <div style={tabStyle(tab === 'config')} onClick={() => setTab('config')}>🎛️ Configuración</div>
        <div style={tabStyle(tab === 'overlays')} onClick={() => setTab('overlays')}>📋 Overlays</div>
        <div
          style={{ padding: '10px 12px', cursor: 'pointer', color: '#aaa' }}
          onClick={onClose}
        >
          ✕
        </div>
      </div>

      {tab === 'config' && (
        <div style={bodyStyle}>
          <div style={rowStyle}>
            <label style={labelStyle}>Separación: {separation}px</label>
            <input
              type="range" min={0} max={100} value={separation}
              onChange={(e) => onSeparationChange(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={rowStyle}>
            <label style={labelStyle}>Ancho: {width}px</label>
            <input
              type="range" min={200} max={700} value={width}
              onChange={(e) => onWidthChange(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={rowStyle}>
            <label style={labelStyle}>Alto: {height}px</label>
            <input
              type="range" min={200} max={900} value={height}
              onChange={(e) => onHeightChange(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      )}

      {tab === 'overlays' && (
        <div style={bodyStyle}>
          <p style={{ fontSize: 12, color: '#999', marginTop: 0 }}>
            Selección múltiple — se apilan en ambos paneles (cámara al fondo si está marcada).
          </p>
          {OVERLAY_OPTIONS.map((opt) => {
            const active = selectedOverlays.includes(opt.key);
            return (
              // <label> en vez de <div onClick> + <input onChange>: con ambos, un click en el
              // checkbox disparaba los dos handlers (el evento burbujea del input al div),
              // alternando el estado dos veces y dejándolo sin cambios. <label> asociado al
              // input es la forma correcta en HTML de que todo el renglón sea clickeable sin
              // duplicar el evento.
              <label key={opt.key} style={overlayOptionStyle(active)}>
                <input type="checkbox" checked={active} onChange={() => onToggleOverlay(opt.key)} />
                <span style={{ fontSize: 13 }}>{opt.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SyncConfigMenu;
