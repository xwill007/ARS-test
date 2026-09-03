import React, { useEffect, useRef, useState } from 'react';
import CameraOverlaySync from './CameraOverlaySync';
import VRLocalVideoOverlaySync from './VRLocalVideoOverlaySync';
import VRConeOverlaySync from './VRConeOverlaySync';
import SyncConfigMenu from './SyncConfigMenu';

const closeButtonStyle = {
  position: 'fixed',
  top: 16,
  right: 24,
  zIndex: 3101,
  background: '#222',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  padding: '8px 18px',
  fontSize: 16,
  cursor: 'pointer',
  opacity: 0.85,
};

const menuButtonStyle = {
  position: 'fixed',
  top: 16,
  left: 16,
  zIndex: 3101,
  background: '#222',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  width: 36,
  height: 36,
  fontSize: 18,
  cursor: 'pointer',
  opacity: 0.85,
};

// Overlays sincronizables por postMessage (todos menos 'camera', que no necesita sync — ver
// CameraOverlaySync.jsx). Cada uno se renderiza apilado (position absolute) sobre la cámara.
const SYNCABLE_OVERLAYS = {
  video: VRLocalVideoOverlaySync,
  cone: VRConeOverlaySync,
};

const layerStyle = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' };

/**
 * SyncStereoTestView — Requerimiento 002, enfoque alternativo al espejo por captura de píxeles:
 * dos instancias reales e independientes de cada overlay seleccionado, sincronizadas en tiempo
 * real vía postMessage. Este componente es el relay: escucha mensajes de CUALQUIERA de los
 * iframes y los reenvía únicamente a su contraparte del MISMO tipo de overlay en el otro panel
 * (nunca al que lo emitió, y nunca a un overlay de otro tipo si hay varios apilados a la vez).
 *
 * Los overlays seleccionados se apilan dentro de cada panel: la cámara (si está marcada) va de
 * fondo, sin necesitar sincronización — cada panel pide su propia cámara en vivo, y como ambos
 * leen el mismo dispositivo físico ya están "sincronizados" sin ningún esfuerzo extra. Los demás
 * overlays (video, cono) tienen fondo transparente en su `<a-scene>`, así que se ven compuestos
 * sobre la cámara, igual que en el flujo real de producción (video/overlay con zIndex 2 sobre el
 * `<video>` con zIndex 1, ver ARPanel.jsx).
 *
 * Incluye el mismo tipo de menú de configuración que la vista de espejo por captura (ARSConfig,
 * botón ☰) — ver SyncConfigMenu.jsx — para ajustar separación/ancho/alto de los paneles y elegir
 * qué overlays mostrar (selección múltiple, como el menú "Overlays" real de producción).
 *
 * No reutiliza ARStereoView.jsx a propósito — ese componente está pensado para el mecanismo de
 * espejo por captura (Intentos 1-6), no para sincronización de estado. Mantenerlos separados
 * evita mezclar dos arquitecturas distintas en el mismo componente mientras se evalúan.
 *
 * Componente de prueba aislado, no se usa desde ningún archivo de producción.
 */
const SyncStereoTestView = ({ onClose }) => {
  // Un ref por tipo de overlay sincronizable, por panel — se crean todos de una, se usen o no,
  // así el relay siempre tiene dónde mirar sin tener que crear/destruir refs dinámicamente.
  const leftRefs = useRef({ video: React.createRef(), cone: React.createRef() });
  const rightRefs = useRef({ video: React.createRef(), cone: React.createRef() });

  const [showMenu, setShowMenu] = useState(false);
  const [separation, setSeparation] = useState(24);
  const [panelWidth, setPanelWidth] = useState(380);
  const [panelHeight, setPanelHeight] = useState(480);
  const [selectedOverlays, setSelectedOverlays] = useState(['camera', 'video']);

  const toggleOverlay = (key) => {
    setSelectedOverlays((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  useEffect(() => {
    const handleMessage = (ev) => {
      const msg = ev.data;
      if (!msg || msg.source !== 'ars-sync-test') return;
      for (const key of Object.keys(SYNCABLE_OVERLAYS)) {
        const leftWindow = leftRefs.current[key].current?.contentWindow;
        const rightWindow = rightRefs.current[key].current?.contentWindow;
        if (ev.source === leftWindow && rightWindow) {
          rightWindow.postMessage(msg, '*');
          return;
        }
        if (ev.source === rightWindow && leftWindow) {
          leftWindow.postMessage(msg, '*');
          return;
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const panelStyle = {
    position: 'relative',
    width: panelWidth,
    height: panelHeight,
    background: '#111',
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid rgba(79,195,247,0.2)',
  };

  const renderPanel = (side, refs) => (
    <div style={panelStyle}>
      {selectedOverlays.includes('camera') && (
        <div style={layerStyle}><CameraOverlaySync /></div>
      )}
      {selectedOverlays
        .filter((key) => SYNCABLE_OVERLAYS[key])
        .map((key) => {
          const OverlayComponent = SYNCABLE_OVERLAYS[key];
          return (
            <div key={key} style={layerStyle}>
              <OverlayComponent
                ref={refs.current[key]}
                isPrimaryPanel={side === 'left'}
                isRightPanel={side === 'right'}
              />
            </div>
          );
        })}
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'black',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: separation,
      }}
    >
      <button style={menuButtonStyle} onClick={() => setShowMenu((v) => !v)}>☰</button>
      <button style={closeButtonStyle} onClick={onClose}>Volver</button>

      {showMenu && (
        <SyncConfigMenu
          onClose={() => setShowMenu(false)}
          separation={separation} onSeparationChange={setSeparation}
          width={panelWidth} onWidthChange={setPanelWidth}
          height={panelHeight} onHeightChange={setPanelHeight}
          selectedOverlays={selectedOverlays} onToggleOverlay={toggleOverlay}
        />
      )}

      {renderPanel('left', leftRefs)}
      {renderPanel('right', rightRefs)}
    </div>
  );
};

export default SyncStereoTestView;
