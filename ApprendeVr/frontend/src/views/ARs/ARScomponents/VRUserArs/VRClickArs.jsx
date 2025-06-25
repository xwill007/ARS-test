import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

const VRClickArs = ({ raycaster }) => {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    const handleClick = (event) => {
      event.preventDefault();
      
      if (!raycaster?.current) return;

      // Actualizar raycaster
      raycaster.current.setFromCamera({ x: 0, y: 0 }, camera);
      const intersects = raycaster.current.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        
        // Trigger onClick si existe
        if (intersectedObject.userData.onClick) {
          intersectedObject.userData.onClick(intersects[0]);
        }

        // Trigger onPointerDown event
        if (intersectedObject.userData.onPointerDown) {
          intersectedObject.userData.onPointerDown(intersects[0]);
        }

        // Cambiar color temporalmente si es interactivo
        if (intersectedObject.userData.interactive) {
          const originalColor = intersectedObject.material.color.clone();
          intersectedObject.material.color.setHex(0xff4444);
          
          setTimeout(() => {
            intersectedObject.material.color.copy(originalColor);
          }, 200);
        }

        console.log('VRClickArs: Object clicked:', intersectedObject.userData);
      }
    };

    const handleTouchStart = (event) => {
      // Para dispositivos táctiles
      handleClick(event);
    };

    // Agregar event listeners
    gl.domElement.addEventListener('click', handleClick);
    gl.domElement.addEventListener('touchstart', handleTouchStart);

    return () => {
      gl.domElement.removeEventListener('click', handleClick);
      gl.domElement.removeEventListener('touchstart', handleTouchStart);
    };
  }, [gl, scene, camera, raycaster]);

  return null;
};

export default VRClickArs;