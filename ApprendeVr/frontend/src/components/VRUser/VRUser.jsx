import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, SphereGeometry, MeshBasicMaterial, Mesh, Raycaster, Color } from 'three';
import VRMoveControls from './VRMoveControls';
import VRCamera from './VRCamera';
import VRAvatar from './VRAvatar'; // Import VRAvatar
import { showLogs } from '../../config/config'; // Import showLogs

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
  const frameCounter = useRef(0); // Counter to control logging frequency
  const logInterval = 60; // Log every 60 frames (adjust as needed)
  const mouseMoveFrameCounter = useRef(0); // Counter for mousemove logging
  const mouseMoveLogInterval = 30; // Log mousemove every 30 frames

  // Rotación inicial para que el avatar mire hacia atrás (de espaldas)
  const initialAvatarRotation = [0, Math.PI, 0];

  useEffect(() => {
    if (showLogs) console.log('VRUser: useEffect - Mounting');

    // Crear esfera del cursor
    const geometry = new SphereGeometry(initialPointerScale, 30, 30);
    const material = new MeshBasicMaterial({ color: pointerColor });
    pointer.current = new Mesh(geometry, material);
    scene.add(pointer.current);

    const handleClick = () => {
      if (showLogs) console.log('VRUser: handleClick');
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
      mouseMoveFrameCounter.current++;
      if (mouseMoveFrameCounter.current % mouseMoveLogInterval === 0) {
        if (showLogs) console.log('VRUser: handleMouseMove');
        mouseMoveFrameCounter.current = 0; // Reset the counter
      }
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
      if (showLogs) console.log('VRUser: handleMouseDown');
      setIsDragging(true);
    };

    const handleMouseUp = () => {
      if (showLogs) console.log('VRUser: handleMouseUp');
      setIsDragging(false);
    };

    gl.domElement.addEventListener('click', handleClick);
    gl.domElement.addEventListener('mousemove', handleMouseMove);
    gl.domElement.addEventListener('mousedown', handleMouseDown);
    gl.domElement.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (showLogs) console.log('VRUser: useEffect - Unmounting');
      gl.domElement.removeEventListener('click', handleClick);
      gl.domElement.removeEventListener('mousemove', handleMouseMove);
      gl.domElement.removeEventListener('mousedown', handleMouseDown);
      gl.domElement.removeEventListener('mouseup', handleMouseUp);
      scene.remove(pointer.current);
    };
  }, [scene, gl, rotation, isDragging, pointerColor, camera]);

  useFrame(() => {
    frameCounter.current++;

    if (frameCounter.current % logInterval === 0) {
      if (showLogs) console.log('VRUser: useFrame - Updating');
      frameCounter.current = 0; // Reset the counter
    }
    // Sincronizar la cámara con el avatar (first person, altura de ojos)
    const eyeHeight = 1.60;
    camera.position.set(
      userPosition.current.x,
      userPosition.current.y + eyeHeight,
      userPosition.current.z +(-0.2)
    );
    camera.rotation.x = rotation.x;
    camera.rotation.y = rotation.y;
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
      <VRAvatar position={userPosition.current} scale={1.0} rotation={initialAvatarRotation} />
    </>
  );
};

export default VRUser;