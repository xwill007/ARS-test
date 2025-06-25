import React, { useRef, useEffect, useState } from 'react';
import { Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';

const VRMoveControlsArs = ({ moveSpeed = 0.05, userPosition, camera }) => {
  const moveDirection = useRef(new Vector3());
  const [isMobile] = useState(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  const [touchStart, setTouchStart] = useState(null);
  const [isMoving, setIsMoving] = useState(false);
  const keys = useRef({});

  useEffect(() => {
    if (isMobile) {
      // Controles táctiles para móvil
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
        const deltaX = touch.clientX - touchStart.x;
        const deltaY = touchStart.y - touch.clientY;

        // Movimiento basado en gestos táctiles
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          // Movimiento vertical (adelante/atrás)
          if (deltaY > 20) {
            moveDirection.current.set(0, 0, 1); // Adelante
          } else if (deltaY < -20) {
            moveDirection.current.set(0, 0, -1); // Atrás
          }
        } else {
          // Movimiento horizontal (izquierda/derecha)
          if (deltaX > 20) {
            moveDirection.current.set(1, 0, 0); // Derecha
          } else if (deltaX < -20) {
            moveDirection.current.set(-1, 0, 0); // Izquierda
          }
        }
      };

      const handleTouchEnd = () => {
        setTouchStart(null);
        setIsMoving(false);
        moveDirection.current.set(0, 0, 0);
      };

      document.addEventListener('touchstart', handleTouchStart, { passive: false });
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    } else {
      // Controles de teclado para desktop
      const handleKeyDown = (event) => {
        keys.current[event.code] = true;
        
        // Actualizar dirección de movimiento
        updateMoveDirection();
      };

      const handleKeyUp = (event) => {
        keys.current[event.code] = false;
        
        // Actualizar dirección de movimiento
        updateMoveDirection();
      };

      const updateMoveDirection = () => {
        const direction = new Vector3(0, 0, 0);
        
        // WASD y flechas
        if (keys.current['KeyW'] || keys.current['ArrowUp']) {
          direction.z += 1; // Adelante
        }
        if (keys.current['KeyS'] || keys.current['ArrowDown']) {
          direction.z -= 1; // Atrás
        }
        if (keys.current['KeyA'] || keys.current['ArrowLeft']) {
          direction.x -= 1; // Izquierda
        }
        if (keys.current['KeyD'] || keys.current['ArrowRight']) {
          direction.x += 1; // Derecha
        }
        if (keys.current['KeyQ']) {
          direction.y += 1; // Arriba
        }
        if (keys.current['KeyE']) {
          direction.y -= 1; // Abajo
        }

        moveDirection.current.copy(direction.normalize());
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
    if (moveDirection.current.length() === 0) return;

    // Movimiento adelante/atrás
    if (moveDirection.current.z !== 0) {
      const direction = new Vector3();
      camera.getWorldDirection(direction);
      direction.y = 0; // Mantener en el plano horizontal
      direction.normalize();
      userPosition.current.addScaledVector(direction, moveSpeed * moveDirection.current.z);
    }

    // Movimiento izquierda/derecha (strafe)
    if (moveDirection.current.x !== 0) {
      const direction = new Vector3();
      camera.getWorldDirection(direction);
      direction.y = 0;
      direction.normalize();
      const strafeDirection = new Vector3(-direction.z, 0, direction.x);
      strafeDirection.normalize();
      userPosition.current.addScaledVector(strafeDirection, moveSpeed * moveDirection.current.x);
    }

    // Movimiento vertical
    if (moveDirection.current.y !== 0) {
      userPosition.current.y += moveSpeed * moveDirection.current.y;
    }
  });

  return null;
};

export default VRMoveControlsArs;