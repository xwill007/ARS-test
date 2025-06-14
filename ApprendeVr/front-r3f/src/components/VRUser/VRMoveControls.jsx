import React, { useRef, useEffect, useState } from 'react';
import { Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';

const VRMoveControls = ({ moveSpeed, userPosition, camera }) => {
  const moveDirection = useRef(new Vector3());
  const [isMobile] = useState(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  const [touchStart, setTouchStart] = useState(null);
  const [ setIsMoving] = useState(false);

  useEffect(() => {
    if (isMobile) {
      // Configurar controles táctiles
      const handleTouchStart = (event) => {
        const touch = event.touches[0];
        setTouchStart({
          x: touch.clientX,
          y: touch.clientY
        });
        setIsMoving(true);
      };

      const handleTouchMove = (event) => {
        if (!touchStart) return;
        
        const touch = event.touches[0];
        const deltaY = touchStart.y - touch.clientY;

        // Movimiento hacia adelante/atrás basado en el deslizamiento vertical
        if (deltaY > 10) {
          moveDirection.current.set(0, 0, 1); // Adelante
        } else if (deltaY < -10) {
          moveDirection.current.set(0, 0, -1); // Atrás
        } else {
          moveDirection.current.set(0, 0, 0);
        }
      };

      const handleTouchEnd = () => {
        setTouchStart(null);
        setIsMoving(false);
        moveDirection.current.set(0, 0, 0);
      };

      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    } else {
      // Controles de teclado para desktop
      const handleKeyDown = (event) => {
        switch (event.key) {
          case 'ArrowUp':
            moveDirection.current.set(0, 0, 1);
            break;
          case 'ArrowDown':
            moveDirection.current.set(0, 0, -1);
            break;
          case 'ArrowLeft':
            moveDirection.current.set(-1, 0, 0);
            break;
          case 'ArrowRight':
            moveDirection.current.set(1, 0, 0);
            break;
          default:
            moveDirection.current.set(0, 0, 0);
            break;
        }
      };

      const handleKeyUp = () => {
        moveDirection.current.set(0, 0, 0);
      };

      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, [isMobile, touchStart]);

  useFrame(() => {
    if (moveDirection.current.z !== 0) {
      const direction = new Vector3();
      camera.getWorldDirection(direction);
      direction.y = 0;
      direction.normalize();
      userPosition.current.addScaledVector(direction, moveSpeed * moveDirection.current.z);
    }
    if (moveDirection.current.x !== 0) {
      const direction = new Vector3();
      camera.getWorldDirection(direction);
      direction.y = 0;
      direction.normalize();
      const strafeDirection = new Vector3(-direction.z, 0, direction.x);
      strafeDirection.normalize();
      userPosition.current.addScaledVector(strafeDirection, moveSpeed * moveDirection.current.x);
    }
  });

  return null;
};

export default VRMoveControls;