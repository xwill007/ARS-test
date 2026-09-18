import React, { useEffect } from 'react';
import SyncStereoTestView from '../SyncStereoTestView';
import { enterFullscreen, exitFullscreen } from '../../fullscreenHelper';

const goHome = () => {
  exitFullscreen();
  window.location.href = '/';
};

/**
 * ARTestMirrorButton — Requerimiento 002/018 (ampliación): monta AR-SYNC directo al cargar
 * `artest-mirror.html`, sin selector previo. Antes ofrecía elegir entre "AR-TEST" (mecanismo de
 * espejo por captura de píxeles, `TestOverlayAR2.jsx`) y "AR-SYNC" (`SyncStereoTestView.jsx`) —
 * pedido del usuario: "quiero que al ingresar a la ruta .../artest-mirror.html se muestre de
 * inmediato la vista actual sin necesidad de dar al boton AR-SYNC". AR-TEST se elimina del todo
 * (`TestOverlayAR2.jsx`, sin otros usos en el repo — confirmado por grep) porque ya no tiene
 * ningún punto de entrada.
 *
 * `onClose` (disparado por la porción "Volver" de la brújula 3D de AR-SYNC, ver
 * SyncStereoTestView.jsx) ahora navega directo a inicio: sin selector al que volver, "Volver" solo
 * puede significar salir de esta vista de prueba por completo.
 *
 * Hallazgo real conservado del código anterior: `requestFullscreen()` exige un gesto de usuario
 * real — llamarlo acá, en un efecto que corre al montar (sin click de por medio), es rechazado en
 * silencio por el navegador en la mayoría de los casos. Se llama de todos modos (no rompe nada si
 * falla) porque ya no hay ningún botón/gesto previo del que colgarlo; el usuario puede entrar a
 * pantalla completa a mano si el navegador no la concedió sola.
 *
 * Componente temporal: eliminar esta carpeta completa (mirror-fix/) cuando termine la validación.
 */
const ARTestMirrorButton = () => {
  useEffect(() => {
    enterFullscreen();
    return () => exitFullscreen();
  }, []);

  return <SyncStereoTestView onClose={goHome} />;
};

export default ARTestMirrorButton;
