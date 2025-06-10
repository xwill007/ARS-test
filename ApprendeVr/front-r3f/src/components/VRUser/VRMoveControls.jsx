import React, { useRef, useEffect } from 'react';
import { Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';

const VRMoveControls = ({ moveSpeed, userPosition, camera }) => {
  const moveDirection = useRef(new Vector3());

  useEffect(() => {
    const handleKeyDown = (event) => {
      switch (event.key) {
        case 'ArrowUp':
          moveDirection.current.set(0, 0, 1); // Move forward relative to camera
          break;
        case 'ArrowDown':
          moveDirection.current.set(0, 0, -1); // Move backward relative to camera
          break;
        case 'ArrowLeft':
          moveDirection.current.set(-1, 0, 0); // Strafe left relative to camera
          break;
        case 'ArrowRight':
          moveDirection.current.set(1, 0, 0); // Strafe right relative to camera
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
  }, []);

  useFrame(() => {
    // Move the user based on raycaster direction
    if (moveDirection.current.z !== 0) {
      const direction = new Vector3();
      camera.getWorldDirection(direction);
      direction.y = 0; // Keep movement horizontal
      direction.normalize();

      userPosition.current.addScaledVector(direction, moveSpeed * moveDirection.current.z);
    }
    if (moveDirection.current.x !== 0) {
      const direction = new Vector3();
      camera.getWorldDirection(direction);
      direction.y = 0; // Keep movement horizontal
      direction.normalize();
      const strafeDirection = new Vector3(-direction.z, 0, direction.x);
      strafeDirection.normalize();
      userPosition.current.addScaledVector(strafeDirection, moveSpeed * moveDirection.current.x);
    }
  });

  return null;
};

export default VRMoveControls;