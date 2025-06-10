import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Raycaster, SphereGeometry, MeshBasicMaterial, Mesh, CylinderGeometry } from 'three';
import { Color } from 'three';
import VRMoveControls from './VRMoveControls';
import VRCamera from './VRCamera';

const VRUser = ({ initialPosition = [0, 1, 0], initialRotation = [0, 0, 0] }) => {
  const { scene, gl, camera } = useThree();
  const moveSpeed = 0.1;
  const userPosition = useRef(new Vector3(...initialPosition));
  const raycaster = useRef(new Raycaster());
  const pointer = useRef(null);
  const [rotation, setRotation] = useState({ x: initialRotation[0], y: initialRotation[1] });
  const [isDragging, setIsDragging] = useState(false);
  const [pointerColor, setPointerColor] = useState(new Color(getComputedStyle(document.documentElement).getPropertyValue('--white'))); // Initial color: white
  const cylinderRef = useRef();

  useEffect(() => {
    // Create pointer sphere
    const geometry = new SphereGeometry(0.05, 32, 32);
    const material = new MeshBasicMaterial({ color: pointerColor });
    pointer.current = new Mesh(geometry, material);
    scene.add(pointer.current);

    // Create cylinder
    const cylinderGeometry = new CylinderGeometry(0.5, 0.5, 2, 32);
    const cylinderMaterial = new MeshBasicMaterial({ color: 0x00ffff }); // Cyan color
    cylinderRef.current = new Mesh(cylinderGeometry, cylinderMaterial);
    scene.add(cylinderRef.current);
    cylinderRef.current.position.copy(userPosition.current);

    const handleClick = () => {
      raycaster.current.setFromCamera(new Vector3(), camera);
      const intersects = raycaster.current.intersectObjects(scene.children);

      if (intersects.length > 0) {
        // Check if the intersected object is a VRDado
        if (intersects[0].object.userData.isVRDado) {
          // Change color if clicked on a VRDado
          setPointerColor(new Color(getComputedStyle(document.documentElement).getPropertyValue('--red'))); // Red
          // Revert to initial color after a short delay
          setTimeout(() => {
            setPointerColor(new Color(getComputedStyle(document.documentElement).getPropertyValue('--white'))); // White
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
      scene.remove(cylinderRef.current);
    };
  }, [scene, gl, rotation, isDragging]);

  useFrame(() => {
    pointer.current.material.color.set(pointerColor);

    cylinderRef.current.position.copy(userPosition.current);

    // Update raycaster and pointer position
    raycaster.current.setFromCamera(new Vector3(), camera);
    const intersects = raycaster.current.intersectObjects(scene.children);

    if (intersects.length > 0) {
      pointer.current.position.copy(intersects[0].point);
      if (intersects[0].object.userData.isVRDado) {
        setPointerColor(new Color(getComputedStyle(document.documentElement).getPropertyValue('--red'))); // Red
      } else {
        setPointerColor(new Color(getComputedStyle(document.documentElement).getPropertyValue('--white'))); // White
      }
    } else {
      setPointerColor(new Color(getComputedStyle(document.documentElement).getPropertyValue('--white'))); // White
      // If no intersection, position the pointer a fixed distance in front of the camera
      const pointerDistance = 5;
      const vector = new Vector3(0, 0, -pointerDistance);
      vector.applyQuaternion(camera.quaternion);
      pointer.current.position.copy(camera.position).add(vector);
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
    </>
  );
};

export default VRUser;