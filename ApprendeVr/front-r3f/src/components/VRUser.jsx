import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Raycaster, SphereGeometry, MeshBasicMaterial, Mesh, CylinderGeometry } from 'three';

const VRUser = ({ initialPosition = [0, 1, 0] }) => {
  const { scene, gl, camera } = useThree();
  const moveSpeed = 0.1;
  const userPosition = useRef(new Vector3(...initialPosition));
  const raycaster = useRef(new Raycaster());
  const pointer = useRef(null);
  const [pointerColor, setPointerColor] = useState(0xff0000); // Initial color: red
  const cylinderRef = useRef();

  useEffect(() => {
    // Create pointer sphere
    const geometry = new SphereGeometry(0.05, 32, 32);
    const material = new MeshBasicMaterial({ color: pointerColor });
    pointer.current = new Mesh(geometry, material);
    scene.add(pointer.current);
    pointer.current.position.set(0, 0, -2); // Set fixed position relative to the camera

    // Create cylinder
    const cylinderGeometry = new CylinderGeometry(0.5, 0.5, 2, 32);
    const cylinderMaterial = new MeshBasicMaterial({ color: 0x00ffff }); // Cyan color
    cylinderRef.current = new Mesh(cylinderGeometry, cylinderMaterial);
    scene.add(cylinderRef.current);
    cylinderRef.current.position.copy(userPosition.current);

    const handleKeyDown = (event) => {
      switch (event.key) {
        case 'ArrowUp':
          userPosition.current.z += moveSpeed;
          break;
        case 'ArrowDown':
          userPosition.current.z -= moveSpeed;
          break;
        case 'ArrowLeft':
          userPosition.current.x += moveSpeed;
          break;
        case 'ArrowRight':
          userPosition.current.x -= moveSpeed;
          break;
        default:
          break;
      }
    };

    const handleClick = () => {
      raycaster.current.setFromCamera(new Vector3(0, 0, 0), camera);
      const intersects = raycaster.current.intersectObjects(scene.children);

      if (intersects.length > 0) {
        // Change color if clicked on an object
        setPointerColor(0x00ff00); // Green
      } else {
        // Revert to initial color if clicked on nothing
        setPointerColor(0xff0000); // Red
      }

      // Change back to the original color after a short delay
      setTimeout(() => {
        setPointerColor(0xff0000);
      }, 250);
    };

    gl.domElement.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      gl.domElement.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
      scene.remove(pointer.current); // Remove the pointer when the component unmounts
      scene.remove(cylinderRef.current);
    };
  }, [scene, gl, pointerColor, camera]);

  useFrame(() => {
    cylinderRef.current.position.copy(userPosition.current);
    pointer.current.material.color.set(pointerColor);

    // Set camera position to follow the user
    camera.position.set(
      userPosition.current.x,
      userPosition.current.y + 1, // Camera slightly above the user
      userPosition.current.z - 3  // Camera a bit behind the user
    );
    camera.lookAt(userPosition.current);
  });

  return null;
};

export default VRUser;