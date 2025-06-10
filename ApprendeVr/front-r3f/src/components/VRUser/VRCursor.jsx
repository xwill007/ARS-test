import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { TorusGeometry, MeshBasicMaterial, Mesh, Vector3 } from 'three';

const VRCursor = ({ pointerColor, initialPointerScale }) => {
  const { scene, camera } = useThree();
  const pointer = useRef(null);

  useEffect(() => {
    const geometry = new TorusGeometry(initialPointerScale, Math.max(initialPointerScale / 5, 0.001), 32, 100);
    const material = new MeshBasicMaterial({ color: pointerColor });
    pointer.current = new Mesh(geometry, material);
    scene.add(pointer.current);

    return () => {
      scene.remove(pointer.current);
    };
  }, [scene, pointerColor, initialPointerScale]);

  useFrame(() => {
    if (!pointer.current) return;

    pointer.current.material.color.set(pointerColor);

    // Raycast from the cursor
    const pointerDistance = 5;
    const vector = new Vector3(0, 0, -pointerDistance);
    vector.applyQuaternion(camera.quaternion);
    pointer.current.position.copy(camera.position).add(vector);
  });

  return null;
};

export default VRCursor;