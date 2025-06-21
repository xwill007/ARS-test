import React from 'react';

/**
 * ARStereoButton
 * Botón 3D reutilizable para activar la vista AR Estéreo.
 * Props:
 *  - position: posición 3D
 *  - scale: escala
 *  - text: texto a mostrar
 *  - onClick: handler de click
 */
const ARStereoButton = ({ position, scale, text, onClick }) => (
  <group position={position} scale={[scale, scale, scale]}>
    <mesh onClick={onClick} castShadow receiveShadow>
      <boxGeometry args={[1.2, 0.4, 0.2]} />
      <meshStandardMaterial color={'#1e90ff'} />
    </mesh>
    <mesh position={[0, 0, 0.12]}>
      <planeGeometry args={[1.1, 0.3]} />
      <meshBasicMaterial color={'#222'} transparent opacity={0.7} />
    </mesh>
    {/* Puedes agregar texto 3D aquí si lo deseas */}
  </group>
);

export default ARStereoButton;
