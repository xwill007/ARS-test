import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import { useState, useEffect } from 'react';
import * as THREE from 'three';

const VRCamera = () => {
  const { camera } = useThree();
  const { isPresenting } = useXR();
  const [deviceOrientation, setDeviceOrientation] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Solicitar permisos para iOS
  useEffect(() => {
    if (!isMobile || isPresenting) return;

    const requestPermission = async () => {
      if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
        try {
          const permission = await DeviceOrientationEvent.requestPermission();
          setHasPermission(permission === 'granted');
        } catch (error) {
          console.error('Permission error:', error);
        }
      } else {
        setHasPermission(true);
      }
    };

    requestPermission();
  }, [isMobile, isPresenting]);

  // Manejar eventos de orientación del dispositivo
  useEffect(() => {
    if (!isMobile || !hasPermission || isPresenting) return;

    const handleOrientation = (event) => {
      setDeviceOrientation({
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma,
      });
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [isMobile, hasPermission, isPresenting]);

  // Actualizar la rotación de la cámara en cada frame
  useFrame(() => {
    if (isPresenting || !deviceOrientation || !hasPermission) return;

    const { alpha, beta, gamma } = deviceOrientation;
    if (alpha !== null && beta !== null && gamma !== null) {
      const euler = new THREE.Euler(
        THREE.MathUtils.degToRad(beta),
        THREE.MathUtils.degToRad(alpha),
        THREE.MathUtils.degToRad(-gamma),
        'YXZ'
      );
      camera.quaternion.setFromEuler(euler);
    }
  });

  return null;
};

export default VRCamera;