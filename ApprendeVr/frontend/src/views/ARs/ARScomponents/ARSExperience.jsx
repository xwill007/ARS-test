import React, { useState } from 'react';
import ARSFloatingButton from './ARSFloatingButton';
import ARStereoView from '../ARSviews/ARStereoView';

/**
 * ARSExperience
 * Componente único que gestiona la experiencia ARS:
 * - Muestra el botón flotante para activar ARS
 * - Al activarse, muestra la vista estereoscópica y el botón para salir
 * Props:
 *  - floatingButtonProps: props para el botón flotante (ubicación, escala)
 *  - stereoViewProps: props para ARStereoView (opcional)
 *  - overlay: componente React a superponer en ambos paneles (puede ser array)
 *  - overlayType: 'r3f' | 'html' | 'mixed' (opcional)
 *  - onARStatusChange: función callback para notificar cambios de estado AR
 */
const ARSExperience = ({ 
  floatingButtonProps = { bottom: 32, right: 32, scale: 1 }, 
  stereoViewProps = {}, 
  overlay = null, 
  overlayType = 'html',
  onARStatusChange 
}) => {
  const [showStereoAR, setShowStereoAR] = useState(false);

  const handleARStart = () => {
    setShowStereoAR(true);
    onARStatusChange?.(true); // Notifica que AR está activo
  };

  const handleAREnd = () => {
    setShowStereoAR(false);
    onARStatusChange?.(false); // Notifica que AR está inactivo
  };

  // Determinar el tipo de overlay automáticamente si es 'mixed'
  const getOverlayType = () => {
    if (overlayType === 'mixed') {
      return 'mixed'; // ARPanel manejará la separación
    }
    return overlayType;
  };

  return (
    <>
      {!showStereoAR && (
        <ARSFloatingButton
          onClick={handleARStart}
          {...floatingButtonProps}
        />
      )}
      {showStereoAR && (
        <ARStereoView
          onClose={handleAREnd}
          floatingButtonProps={floatingButtonProps}
          overlay={overlay}
          overlayType={getOverlayType()}
          {...stereoViewProps}
        />
      )}
    </>
  );
};

export default ARSExperience;
