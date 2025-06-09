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
  const [rotation, setRotation] = useState({ x: 0, y: 0 }); // Track rotation
  const [isDragging, setIsDragging] = useState(false);

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

    const handleKeyDown = (event) => {
      switch (event.key) {
        case 'ArrowUp':
          userPosition.current.z -= moveSpeed * Math.cos(rotation.y);
          userPosition.current.x += moveSpeed * Math.sin(rotation.y);
          break;
        case 'ArrowDown':
          userPosition.current.z += moveSpeed * Math.cos(rotation.y);
          userPosition.current.x -= moveSpeed * Math.sin(rotation.y);
          break;
        case 'ArrowLeft':
          userPosition.current.x -= moveSpeed * Math.cos(rotation.y);
          userPosition.current.z -= moveSpeed * Math.sin(rotation.y);
          break;
        case 'ArrowRight':
          userPosition.current.x += moveSpeed * Math.cos(rotation.y);
          userPosition.current.z += moveSpeed * Math.sin(rotation.y);
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
    document.addEventListener('keydown', handleKeyDown);
    gl.domElement.addEventListener('mousemove', handleMouseMove); // Mouse move
    gl.domElement.addEventListener('mousedown', handleMouseDown);
    gl.domElement.addEventListener('mouseup', handleMouseUp);

    return () => {
      gl.domElement.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
      gl.domElement.removeEventListener('mousemove', handleMouseMove); // Remove
      gl.domElement.removeEventListener('mousedown', handleMouseDown);
      gl.domElement.removeEventListener('mouseup', handleMouseUp);
      scene.remove(pointer.current); // Remove the pointer when the component unmounts
      scene.remove(cylinderRef.current);
    };
  }, [scene, gl, pointerColor, camera, rotation, isDragging]);

  useFrame(() => {
    cylinderRef.current.position.copy(userPosition.current);
    pointer.current.material.color.set(pointerColor);

    // Set camera position to follow the user
    camera.position.set(
      userPosition.current.x,
      userPosition.current.y + 1, // Camera slightly above the user
      userPosition.current.z - 3  // Camera a bit behind the user
    );

    camera.rotation.set(rotation.x, rotation.y, 0); // Apply rotation

    // Update raycaster and pointer position
    raycaster.current.setFromCamera(new Vector3(), camera);
    const intersects = raycaster.current.intersectObjects(scene.children);

    if (intersects.length > 0) {
      pointer.current.position.copy(intersects[0].point);
    } else {
      // If no intersection, position the pointer a fixed distance in front of the camera
      const pointerDistance = 5;
      const vector = new Vector3(0, 0, -pointerDistance);
      vector.applyQuaternion(camera.quaternion);
      pointer.current.position.copy(camera.position).add(vector);
    }
  });

  return null;
};

export default VRUser;