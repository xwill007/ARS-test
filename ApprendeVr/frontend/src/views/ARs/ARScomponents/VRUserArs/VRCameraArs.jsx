import React, { useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3, Euler } from 'three';
import VRCursorArs from './VRCursorArs';
import VRControlMobilArs from './VRControlMobilArs';
import VRControlWebArs from './VRControlWebArs';

// Utilidad simple para detectar móvil
const isMobile = () =>
  typeof window !== 'undefined' &&
  /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

const VRCameraArs = ({ mode, initialPosition, initialRotation }) => {
  const { camera } = useThree();
  const position = useRef(new Vector3(...initialPosition));
  const rotation = useRef(new Euler(...initialRotation));

  useFrame(() => {
    camera.position.copy(position.current);
    camera.rotation.copy(rotation.current);
  });

  return (
    <>
      {/* En primera persona: usa controles según el dispositivo */}
      {mode === 'first' && (
        isMobile()
          ? <VRControlMobilArs />
          : <VRControlWebArs />
      )}
      <VRCursorArs />
    </>
  );
};

export default VRCameraArs;