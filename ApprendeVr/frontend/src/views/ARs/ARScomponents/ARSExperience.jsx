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
 *  - overlay: componente React a superponer en ambos paneles
 *  - overlayType: 'r3f' | 'html' (opcional)
 */
const ARSExperience = ({ floatingButtonProps = { bottom: 32, right: 32, scale: 1 }, stereoViewProps = {}, overlay = null, overlayType = 'html' }) => {
  const [showStereoAR, setShowStereoAR] = useState(false);
  return (
    <>
      {!showStereoAR && (
        <ARSFloatingButton
          onClick={() => setShowStereoAR(true)}
          {...floatingButtonProps}
        />
      )}
      {showStereoAR && (
        <ARStereoView
          onClose={() => setShowStereoAR(false)}
          floatingButtonProps={floatingButtonProps}
          overlay={overlay}
          overlayType={overlayType}
          {...stereoViewProps}
        />
      )}
    </>
  );
};

export default ARSExperience;
