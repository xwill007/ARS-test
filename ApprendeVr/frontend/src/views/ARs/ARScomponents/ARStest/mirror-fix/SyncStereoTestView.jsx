import React, { useEffect, useRef, useState } from 'react';
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

const OVERLAY_COMPONENTS = {
  video: VRLocalVideoOverlaySync,
  cone: VRConeOverlaySync,
};

/**
 * SyncStereoTestView — Requerimiento 002, enfoque alternativo al espejo por captura de píxeles:
 * dos instancias reales e independientes de un overlay *Sync (copia de un componente real de
 * producción con un puente de sincronización agregado), sincronizadas en tiempo real vía
 * postMessage. Este componente es el relay: escucha mensajes de CUALQUIERA de los dos iframes y
 * los reenvía al otro (nunca al que lo emitió, para no generar eco).
 *
 * Incluye el mismo tipo de menú de configuración que la vista de espejo por captura (ARSConfig,
 * botón ☰) — ver SyncConfigMenu.jsx — para ajustar separación/ancho/alto de los paneles y elegir
 * qué overlay mostrar en ambos.
 *
 * No reutiliza ARStereoView.jsx a propósito — ese componente está pensado para el mecanismo de
 * espejo por captura (Intentos 1-6), no para sincronización de estado. Mantenerlos separados
 * evita mezclar dos arquitecturas distintas en el mismo componente mientras se evalúan.
 *
 * Componente de prueba aislado, no se usa desde ningún archivo de producción.
 */
const SyncStereoTestView = ({ onClose }) => {
  const leftRef = useRef(null);
  const rightRef = useRef(null);

  const [showMenu, setShowMenu] = useState(false);
  const [separation, setSeparation] = useState(24);
  const [panelWidth, setPanelWidth] = useState(380);
  const [panelHeight, setPanelHeight] = useState(480);
  const [overlayKey, setOverlayKey] = useState('video');

  useEffect(() => {
    const handleMessage = (ev) => {
      const msg = ev.data;
      if (!msg || msg.source !== 'ars-sync-test') return;
      const leftWindow = leftRef.current?.contentWindow;
      const rightWindow = rightRef.current?.contentWindow;
      // Reenviar al que NO fue la fuente del mensaje.
      if (ev.source === leftWindow && rightWindow) {
        rightWindow.postMessage(msg, '*');
      } else if (ev.source === rightWindow && leftWindow) {
        leftWindow.postMessage(msg, '*');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const OverlayComponent = OVERLAY_COMPONENTS[overlayKey];
  const panelStyle = {
    width: panelWidth,
    height: panelHeight,
    background: '#111',
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid rgba(79,195,247,0.2)',
  };

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
          overlayKey={overlayKey} onOverlayChange={setOverlayKey}
        />
      )}

      {/* key={overlayKey}: al cambiar de overlay se remonta todo de cero (iframes nuevos, estado
          de sync limpio) en vez de intentar reusar los iframes existentes con otro contenido. */}
      <div style={panelStyle}>
        <OverlayComponent key={overlayKey + '-left'} ref={leftRef} isPrimaryPanel={true} isRightPanel={false} />
      </div>
      <div style={panelStyle}>
        <OverlayComponent key={overlayKey + '-right'} ref={rightRef} isPrimaryPanel={false} isRightPanel={true} />
      </div>
    </div>
  );
};

export default SyncStereoTestView;
