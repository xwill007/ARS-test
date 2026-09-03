import React, { useEffect, useRef } from 'react';
import VRLocalVideoOverlaySync from './VRLocalVideoOverlaySync';

const panelStyle = {
  width: 380,
  height: 480,
  background: '#111',
  borderRadius: 8,
  overflow: 'hidden',
  border: '1px solid rgba(79,195,247,0.2)',
};

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

/**
 * SyncStereoTestView — Requerimiento 002, enfoque alternativo al espejo por captura de píxeles:
 * dos instancias reales e independientes de VRLocalVideoOverlaySync (copia del componente de
 * video real de producción, ver ese archivo), sincronizadas en tiempo real vía postMessage. Este
 * componente es el relay: escucha mensajes de CUALQUIERA de los dos iframes y los reenvía al otro
 * (nunca al que lo emitió, para no generar eco).
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
        gap: 24,
      }}
    >
      <button style={closeButtonStyle} onClick={onClose}>Volver</button>
      <div style={panelStyle}>
        <VRLocalVideoOverlaySync ref={leftRef} isPrimaryPanel={true} isRightPanel={false} />
      </div>
      <div style={panelStyle}>
        <VRLocalVideoOverlaySync ref={rightRef} isPrimaryPanel={false} isRightPanel={true} />
      </div>
    </div>
  );
};

export default SyncStereoTestView;
