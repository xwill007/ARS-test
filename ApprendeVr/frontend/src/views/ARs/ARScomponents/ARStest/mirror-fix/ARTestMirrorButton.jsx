import React, { useState, useEffect } from 'react';
import ARStereoView from '../../../ARSviews/ARStereoView';
import TestOverlayAR2 from './TestOverlayAR2';
import SyncStereoTestView from './SyncStereoTestView';
import { enterFullscreen, exitFullscreen } from './fullscreenHelper';
import { useVRLanguage } from '../../../../../components/VRConfig/VRLanguageContext';

const buttonStyle = (bottom) => ({
  position: 'fixed',
  bottom,
  left: 16,
  zIndex: 4000,
  background: 'rgba(30,30,30,0.92)',
  color: 'white',
  border: '1px solid #555',
  borderRadius: 8,
  padding: '8px 14px',
  fontWeight: 'bold',
  cursor: 'pointer',
});

const inicioButtonStyle = {
  position: 'fixed',
  top: 16,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 5000,
  background: 'rgba(30,30,30,0.92)',
  color: 'white',
  border: '1px solid #555',
  borderRadius: 8,
  padding: '8px 16px',
  fontWeight: 'bold',
  cursor: 'pointer',
};

const goHome = () => {
  exitFullscreen();
  window.location.href = '/';
};

/**
 * ARTestMirrorButton — Requerimiento 002, botones de prueba aislados, SIN tocar ni integrarse al
 * flujo real de "AR" (ARSExperience/AROverlayController/appArs):
 *
 * - "AR-TEST": mecanismo de espejo por captura de píxeles (Intento 4 ganador del checklist, ver
 *   TestOverlayAR2.jsx). Abre ARStereoView.jsx (sin modificarlo) con ese overlay de prueba.
 *   Reproducir: click en "AR-TEST", abrir el menú hamburguesa (⚙️ arriba a la izquierda) y
 *   activar "Modo eficiente" + "Panel derecho = izquierdo".
 *
 * - "AR-SYNC": enfoque alternativo propuesto por el usuario — en vez de capturar píxeles, dos
 *   instancias reales sincronizadas por estado vía postMessage (play/pause/seek de video). Ver
 *   SyncStereoTestView.jsx. Los overlays disponibles dentro de AR-SYNC (cámara, video, cono,
 *   karaoke — Requerimiento 011) se eligen desde su propio menú ⚙️ (SyncConfigMenu.jsx), no desde
 *   botones acá.
 *
 * Componente temporal: eliminar esta carpeta completa (mirror-fix/) cuando termine la validación.
 */
const ARTestMirrorButton = () => {
  const [open, setOpen] = useState(null); // null | 'mirror' | 'sync'
  const { t } = useVRLanguage();

  // Requerimiento 012: pantalla completa mientras cualquiera de las dos vistas de prueba está
  // abierta — se sale del navegador normal recién al cerrarla (cleanup del efecto), no antes.
  useEffect(() => {
    if (!open) return;
    enterFullscreen();
    return () => exitFullscreen();
  }, [open]);

  return (
    <>
      <button style={inicioButtonStyle} onClick={goHome} title={t('home.backToHome')}>← {t('home.backToHome')}</button>
      {!open && (
        <>
          <button style={buttonStyle(32)} onClick={() => setOpen('mirror')}>{t('overlays.arTest')}</button>
          <button style={buttonStyle(76)} onClick={() => setOpen('sync')}>{t('overlays.arSync')}</button>
        </>
      )}
      {open === 'mirror' && (
        <ARStereoView
          onClose={() => setOpen(null)}
          overlay={<TestOverlayAR2 />}
          overlayType="html"
        />
      )}
      {open === 'sync' && (
        <SyncStereoTestView onClose={() => setOpen(null)} />
      )}
    </>
  );
};

export default ARTestMirrorButton;
