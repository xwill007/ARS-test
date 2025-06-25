import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3, Euler } from 'three';
import VRControlMobilArs from './VRControlMobilArs';
import VRControlWebArs from './VRControlWebArs';

const showLogs = false;

const isMobile = () =>
  typeof window !== 'undefined' &&
  /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

const VRCameraArs = ({ 
  mode, 
  initialPosition, 
  initialRotation, 
  userPosition, 
  rotation, 
  setRotation 
}) => {
  const { camera } = useThree();
  const position = useRef(new Vector3(...initialPosition));
  const cameraRotation = useRef(new Euler(...initialRotation));
  const [isDragging, setIsDragging] = React.useState(false);

  // Configurar eventos de mouse para rotación de cámara
  useEffect(() => {
    if (mode !== 'first' || isMobile()) return;

    const handleMouseMove = (event) => {
      if (!isDragging) return;

      const deltaX = event.movementX || 0;
      const deltaY = event.movementY || 0;

      setRotation(prevRotation => ({
        x: Math.max(-Math.PI/2, Math.min(Math.PI/2, prevRotation.x - deltaY * 0.002)),
        y: prevRotation.y - deltaX * 0.002,
        z: prevRotation.z
      }));
    };

    const handleMouseDown = (event) => {
      if (event.button === 0) { // Click izquierdo
        setIsDragging(true);
        document.body.style.cursor = 'grabbing';
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
    };

    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === camera.canvas;
      setIsDragging(isLocked);
    };

    // Eventos de mouse
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, [mode, isDragging, setRotation, camera]);

  useFrame(() => {
    if (mode === 'first') {
      // Primera persona: cámara sigue al usuario
      const eyeHeight = 1.6;
      camera.position.set(
        userPosition.current.x,
        userPosition.current.y + eyeHeight,
        userPosition.current.z
      );
      
      // Aplicar rotación
      camera.rotation.x = rotation.x;
      camera.rotation.y = rotation.y;
      camera.rotation.z = rotation.z;
    } else if (mode === 'third') {
      // Tercera persona: cámara detrás del usuario
      const offset = new Vector3(0, 3, 5);
      camera.position.copy(userPosition.current).add(offset);
      camera.lookAt(userPosition.current);
    }

    if (showLogs) {
      console.log('[VRCameraArs] Camera position:', camera.position.toArray());
      console.log('[VRCameraArs] Camera rotation:', camera.rotation.toArray());
    }
  });

  if (showLogs) {
    console.log('[VRCameraArs] Render, mode:', mode, 'isMobile:', isMobile());
  }

  return (
    <>
      {mode === 'first' && !isDragging && (
        isMobile()
          ? <VRControlMobilArs />
          : <VRControlWebArs />
      )}
    </>
  );
};

export default VRCameraArs;