import React, { useRef, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Raycaster, Color } from 'three';

const VRCursor = ({ pointer, setPointerColor }) => {
  const { camera, scene } = useThree();
  const raycaster = useRef(new Raycaster());

  const updatePointer = useCallback(() => {
    raycaster.current.setFromCamera(new Vector3(), camera);
    const intersects = raycaster.current.intersectObjects(scene.children);

    if (intersects.length > 0) {
      pointer.current.position.copy(intersects[0].point);
      if (intersects[0].object.userData.isVRDado) {
        setPointerColor(new Color(getComputedStyle(document.documentElement).getPropertyValue('--red')));
      } else {
        setPointerColor(new Color(getComputedStyle(document.documentElement).getPropertyValue('--white')));
      }
    } else {
      setPointerColor(new Color(getComputedStyle(document.documentElement).getPropertyValue('--white')));
      const pointerDistance = 5;
      const vector = new Vector3(0, 0, -pointerDistance);
      vector.applyQuaternion(camera.quaternion);
      pointer.current.position.copy(camera.position).add(vector);
    }
  }, [camera, scene, pointer, setPointerColor]);

  useFrame(() => {
    updatePointer();
  });

  return null;
};

export default VRCursor;