import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Color } from 'three';
import VRCameraArs from './VRCameraArs';
import VRBodyArs from './VRBodyArs';
import VRMoveControlsArs from './VRMoveControlsArs';
import VRCursorArs from './VRCursorArs';
import VRAvatarArs from './VRAvatarArs';

/**
 * VRUserArs - Componente de usuario mejorado para AR/VR
 * Props:
 *  - mode: 'first' | 'third' - Vista en primera o tercera persona
 *  - initialPosition: posición inicial del usuario
 *  - initialRotation: rotación inicial del usuario
 *  - children: otros componentes (escena, overlays, etc)
 *  - showAvatar: mostrar avatar en modo tercera persona
 *  - enableMovement: habilitar controles de movimiento
 *  - enableCursor: mostrar cursor/puntero
 */
const VRUserArs = ({
  mode = 'first',
  initialPosition = [0, 0, 0],
  initialRotation = [0, 0, 0],
  children,
  showAvatar = true,
  enableMovement = true,
  enableCursor = true,
  moveSpeed = 0.05,
  ...props
}) => {
  const { scene, camera } = useThree();
  const userPosition = useRef(new Vector3(...initialPosition));
  const [rotation, setRotation] = useState({ 
    x: initialRotation[0], 
    y: initialRotation[1],
    z: initialRotation[2] 
  });
  const [pointerColor] = useState(new Color('#2196f3'));

  // Configurar posición inicial de la cámara
  useEffect(() => {
    if (mode === 'first') {
      const eyeHeight = 1.6;
      camera.position.set(
        userPosition.current.x,
        userPosition.current.y + eyeHeight,
        userPosition.current.z
      );
    } else if (mode === 'third') {
      // Vista en tercera persona
      camera.position.set(
        userPosition.current.x,
        userPosition.current.y + 3,
        userPosition.current.z + 5
      );
      camera.lookAt(userPosition.current);
    }
  }, [mode, camera]);

  // Actualizar rotación de la cámara
  useFrame(() => {
    if (mode === 'first') {
      camera.rotation.x = rotation.x;
      camera.rotation.y = rotation.y;
      camera.rotation.z = rotation.z;
    }
  });

  return (
    <group {...props}>
      {/* Cámara y controles */}
      <VRCameraArs 
        mode={mode} 
        initialPosition={initialPosition} 
        initialRotation={initialRotation}
        userPosition={userPosition}
        rotation={rotation}
        setRotation={setRotation}
      />

      {/* Controles de movimiento */}
      {enableMovement && (
        <VRMoveControlsArs
          moveSpeed={moveSpeed}
          userPosition={userPosition}
          camera={camera}
        />
      )}

      {/* Cursor/Puntero */}
      {enableCursor && (
        <VRCursorArs 
          userPosition={userPosition}
          pointerColor={pointerColor}
        />
      )}

      {/* Avatar en tercera persona */}
      {mode === 'third' && showAvatar && (
        <>
          <VRBodyArs position={userPosition.current.toArray()} />
          <VRAvatarArs 
            position={userPosition.current} 
            rotation={[0, rotation.y, 0]}
            scale={1.0}
          />
        </>
      )}

      {/* Contenido hijo */}
      {children}
    </group>
  );
};

export default VRUserArs;