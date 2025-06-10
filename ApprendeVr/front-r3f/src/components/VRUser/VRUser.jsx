import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, SphereGeometry, MeshBasicMaterial, Mesh, Raycaster, Color } from 'three';
import VRMoveControls from './VRMoveControls';
import VRCamera from './VRCamera';
import VRAvatar from './VRAvatar'; // Import VRAvatar

const VRUser = ({ initialPosition = [0, 0, 0], initialRotation = [0, 0, 0] }) => {
  const { scene, gl, camera } = useThree();
  const moveSpeed = 0.01;
  const userPosition = useRef(new Vector3(...initialPosition));
  const [rotation, setRotation] = useState({ x: initialRotation[0], y: initialRotation[1] });
  const [isDragging, setIsDragging] = useState(false);
  const [pointerColor, setPointerColor] = useState(new Color(getComputedStyle(document.documentElement).getPropertyValue('--blue')));
  const raycaster = useRef(new Raycaster());
  const initialPointerScale = 0.003;

  const pointer = useRef(null);

  useEffect(() => {
    // Crear esfera del cursor
    const geometry = new SphereGeometry(initialPointerScale, 30, 30);
    const material = new MeshBasicMaterial({ color: pointerColor });
    pointer.current = new Mesh(geometry, material);
    scene.add(pointer.current);

    const handleClick = () => {
      raycaster.current.setFromCamera(new Vector3(), camera);
      const intersects = raycaster.current.intersectObjects(scene.children);

      if (intersects.length > 0) {
        // Check if the intersected object is a VRDado
        if (intersects[0].object.userData.isVRDado) {
          // Change color if clicked on a VRDado
          setPointerColor(new Color(getComputedStyle(document.documentElement).getPropertyValue('--red')));
          // Revert to initial color after a short delay
          setTimeout(() => {
            setPointerColor(new Color(getComputedStyle(document.documentElement).getPropertyValue('--white')));
          }, 250);
        }
      }
    };

    const handleMouseMove = (event) => {
      if (isDragging) {
        const deltaX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const deltaY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        // Update rotation based on mouse movement
        setRotation(prevRotation => ({
          x: prevRotation.x + deltaY * 0.002, // Vertical rotation
          y: prevRotation.y + deltaX * 0.002  // Horizontal rotation
        }));
      }
    };

    const handleMouseDown = () => {
      setIsDragging(true);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    gl.domElement.addEventListener('click', handleClick);
    gl.domElement.addEventListener('mousemove', handleMouseMove);
    gl.domElement.addEventListener('mousedown', handleMouseDown);
    gl.domElement.addEventListener('mouseup', handleMouseUp);

    return () => {
      gl.domElement.removeEventListener('click', handleClick);
      gl.domElement.removeEventListener('mousemove', handleMouseMove);
      gl.domElement.removeEventListener('mousedown', handleMouseDown);
      gl.domElement.removeEventListener('mouseup', handleMouseUp);
      scene.remove(pointer.current);
    };
  }, [scene, gl, rotation, isDragging, pointerColor, camera]);

  useFrame(() => {
    // Update raycaster and pointer position
    raycaster.current.setFromCamera(new Vector3(), camera);
    const intersects = raycaster.current.intersectObjects(scene.children);

    if (pointer.current) {
      if (intersects.length > 0) {
        pointer.current.position.copy(intersects[0].point);
      } else {
        // Si no hay intersección, posicionar el cursor a una distancia fija frente a la cámara
        const pointerDistance = 5;
        const vector = new Vector3(0, 0, -pointerDistance);
        vector.applyQuaternion(camera.quaternion);
        pointer.current.position.copy(camera.position).add(vector);
      }
    }
  });

  return (
    <>
      <VRCamera userPosition={userPosition} rotation={rotation} />
      <VRMoveControls
        moveSpeed={moveSpeed}
        userPosition={userPosition}
        camera={camera}
      />
      <VRAvatar position={userPosition.current} scale={1.0} />
    </>
  );
};

export default VRUser;