import React from 'react';
import VRCameraArs from './VRCameraArs';
import VRBodyArs from './VRBodyArs';

/**
 * VRUserArs
 * Componente contenedor para la lógica de usuario AR/VR.
 * Props:
 *  - mode: 'first' | 'third'
 *  - initialPosition: posición inicial del usuario
 *  - initialRotation: rotación inicial del usuario
 *  - children: otros componentes (escena, overlays, etc)
 */
const VRUserArs = ({
  mode = 'first',
  initialPosition = [0, 0, 0],
  initialRotation = [0, 0, 0],
  children,
  ...props
}) => (
  <group {...props}>
    <VRCameraArs mode={mode} initialPosition={initialPosition} initialRotation={initialRotation} />
    {mode === 'third' && <VRBodyArs position={initialPosition} />}
    {children}
  </group>
);

export default VRUserArs;