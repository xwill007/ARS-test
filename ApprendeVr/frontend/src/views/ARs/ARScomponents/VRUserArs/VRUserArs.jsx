import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Color } from 'three';
import VRCameraArs from './VRCameraArs';
import VRBodyArs from './VRBodyArs';
import VRMoveControlsArs from './VRMoveControlsArs';
import VRCursorArs from './VRCursorArs';
import VRAvatarArs from './VRAvatarArs';
import showLogs from '../../../../tools/showLogs';

// Configuración de logs
const ENABLE_LOGS = false; // Cambiar a false para deshabilitar logs

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

  // Logs de inicialización
  useEffect(() => {
    showLogs('VRUserArs component initialized', 'VRUserArs', ENABLE_LOGS);
    showLogs(mode, 'VRUserArs - Mode', ENABLE_LOGS);
    showLogs(initialPosition, 'VRUserArs - Initial Position', ENABLE_LOGS);
    showLogs(initialRotation, 'VRUserArs - Initial Rotation', ENABLE_LOGS);
  }, []);

  // Configurar posición inicial de la cámara
  useEffect(() => {
    showLogs('Setting up camera initial position', 'VRUserArs - Camera Setup', ENABLE_LOGS);
    
    if (mode === 'first') {
      const eyeHeight = 1.6;
      camera.position.set(
        userPosition.current.x,
        userPosition.current.y + eyeHeight,
        userPosition.current.z
      );
      showLogs(camera.position, 'VRUserArs - First Person Camera Position', ENABLE_LOGS);
    } else if (mode === 'third') {
      // Vista en tercera persona
      camera.position.set(
        userPosition.current.x,
        userPosition.current.y + 3,
        userPosition.current.z + 5
      );
      camera.lookAt(userPosition.current);
      showLogs(camera.position, 'VRUserArs - Third Person Camera Position', ENABLE_LOGS);
    }
  }, [mode, camera]);

  // Log cuando cambia la rotación
  useEffect(() => {
    showLogs(rotation, 'VRUserArs - Rotation Changed', ENABLE_LOGS);
  }, [rotation]);

  // Actualizar rotación de la cámara
  useFrame((state, delta) => {
    if (mode === 'first') {
      camera.rotation.x = rotation.x;
      camera.rotation.y = rotation.y;
      camera.rotation.z = rotation.z;
      
      // Log periódico (cada 60 frames aproximadamente)
      if (state.clock.elapsedTime % 1 < delta) {
        showLogs(`Frame time: ${delta.toFixed(4)}s`, 'VRUserArs - Frame', ENABLE_LOGS);
        showLogs(userPosition.current, 'VRUserArs - User Position', ENABLE_LOGS);
      }
    }
  });

  // Log cuando cambian las props
  useEffect(() => {
    showLogs({
      showAvatar,
      enableMovement,
      enableCursor,
      moveSpeed
    }, 'VRUserArs - Props Update', ENABLE_LOGS);
  }, [showAvatar, enableMovement, enableCursor, moveSpeed]);

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