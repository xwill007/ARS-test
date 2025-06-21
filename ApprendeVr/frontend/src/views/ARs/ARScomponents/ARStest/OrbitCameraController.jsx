import { useThree, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

/**
 * OrbitCameraController
 * Permite controlar la cámara con el dedo o mouse (OrbitControls-like) en R3F overlays.
 * Props:
 *   - target: [x, y, z] (opcional, default: [0, 1, -3])
 *   - enablePan, enableZoom, enableRotate, minDistance, maxDistance, etc.
 */
const OrbitCameraController = ({
  target = [0, 1, -3],
  enablePan = false,
  enableZoom = true,
  enableRotate = true,
  minDistance = 2,
  maxDistance = 10,
  autoRotate = false,
  dampingFactor = 0.125,
  rotateSpeed = 0.3,
}) => {
  const { camera, gl } = useThree();
  const controlsRef = useRef();

  // Lazy load OrbitControls
  useFrame(() => {
    if (controlsRef.current) controlsRef.current.update();
  });

  // Only import OrbitControls in browser
  let OrbitControls = null;
  if (typeof window !== 'undefined') {
    OrbitControls = require('three/examples/jsm/controls/OrbitControls').OrbitControls;
  }

  if (!OrbitControls) return null;

  return (
    <primitive
      ref={controlsRef}
      object={new OrbitControls(camera, gl.domElement)}
      target={new THREE.Vector3(...target)}
      enablePan={enablePan}
      enableZoom={enableZoom}
      enableRotate={enableRotate}
      minDistance={minDistance}
      maxDistance={maxDistance}
      autoRotate={autoRotate}
      dampingFactor={dampingFactor}
      rotateSpeed={rotateSpeed}
      args={[camera, gl.domElement]}
    />
  );
};

export default OrbitCameraController;
