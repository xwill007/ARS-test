import React, { useState } from 'react';
import ARSFloatingButton from './ARSFloatingButton';
import ARStereoView from './ARStereoView';

/**
 * ARSExperience
 * Componente único que gestiona la experiencia ARS:
 * - Muestra el botón flotante para activar ARS
 * - Al activarse, muestra la vista estereoscópica y el botón para salir
 * Props:
 *  - floatingButtonProps: props para el botón flotante (ubicación, escala)
 *  - stereoViewProps: props para ARStereoView (opcional)
 */
const ARSExperience = ({ floatingButtonProps = { bottom: 32, right: 32, scale: 1 }, stereoViewProps = {} }) => {
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
          {...stereoViewProps}
        />
      )}
    </>
  );
};

export default ARSExperience;
