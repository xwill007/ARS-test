import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3, Raycaster, SphereGeometry, MeshBasicMaterial, Mesh } from 'three';
import VRClickArs from './VRClickArs';

const VRCursorArs = ({ userPosition, pointerColor = '#2196f3', pointerScale = 0.05, enabled = true }) => {
  const { scene, camera } = useThree();
  const pointer = useRef(null);
  const raycaster = useRef(new Raycaster());

  useEffect(() => {
    if (!enabled) return;
    
    // Crear cursor 3D
    const geometry = new SphereGeometry(pointerScale, 16, 16);
    const material = new MeshBasicMaterial({ 
      color: pointerColor,
      transparent: true,
      opacity: 0.8
    });
    pointer.current = new Mesh(geometry, material);
    scene.add(pointer.current);

    return () => {
      if (pointer.current) {
        scene.remove(pointer.current);
        pointer.current = null;
      }
    };
  }, [scene, pointerColor, pointerScale, enabled]);

  useFrame(() => {
    if (!enabled || !pointer.current) return;

    // Actualizar color del cursor
    pointer.current.material.color.set(pointerColor);

    // Raycast desde la cámara
    raycaster.current.setFromCamera(new Vector3(0, 0, 0), camera);
    const intersects = raycaster.current.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      // Posicionar cursor en el punto de intersección
      pointer.current.position.copy(intersects[0].point);
      
      // Cambiar opacidad si está sobre un objeto interactivo
      if (intersects[0].object.userData.interactive) {
        pointer.current.material.opacity = 1.0;
      } else {
        pointer.current.material.opacity = 0.6;
      }
    } else {
      // Posicionar cursor a distancia fija frente a la cámara
      const pointerDistance = 3;
      const vector = new Vector3(0, 0, -pointerDistance);
      vector.applyQuaternion(camera.quaternion);
      pointer.current.position.copy(camera.position).add(vector);
      pointer.current.material.opacity = 0.4;
    }
  });

  return enabled ? <VRClickArs raycaster={raycaster} /> : null;
};

export default VRCursorArs;