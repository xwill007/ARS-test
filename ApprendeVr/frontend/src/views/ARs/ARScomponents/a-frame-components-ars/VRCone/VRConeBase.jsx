import React from 'react';

/**
 * Componente que renderiza un cono translúcido en A-Frame
 * @param {Object} props - Propiedades del componente
 * @param {number} props.radius - Radio de la base del cono
 * @param {number} props.height - Altura del cono
 * @param {string} props.position - Posición del cono en formato "x y z"
 * @param {string} props.color - Color del cono en formato hexadecimal
 * @param {number} props.opacity - Opacidad del cono (0-1)
 */
const VRConeBase = ({ 
  radius = 5, 
  height = 10, 
  position = "0 0 0", 
  color = "#0080FF", 
  opacity = 0.5 
}) => {
  return (
    <a-cone
      position={position}
      radius-bottom={radius}
      radius-top="0"
      height={height}
      segments-radial="36"
      segments-height="18"
      material={`color: ${color}; opacity: ${opacity}; transparent: true; side: double`}
    />
  );
};

export default VRConeBase;