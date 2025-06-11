import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Vector3 } from 'three';

const VRAvatar = ({ position = new Vector3(0, 0, 0), scale = 1.0 }) => {
  const { scene } = useThree();
  const avatarRef = useRef();

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.load('/models/PointsMen.glb', (gltf) => {
      avatarRef.current = gltf.scene;
      scene.add(avatarRef.current);
      avatarRef.current.scale.set(scale, scale, scale); // Set scale
      avatarRef.current.position.copy(position); // Set initial position
    }, undefined, function (error) {
      console.error(error);
    });

    return () => {
      if (avatarRef.current) scene.remove(avatarRef.current);
    };
  }, [scene, position, scale]);

  useFrame(() => {
    if (avatarRef.current) {
      avatarRef.current.position.copy(position);
    }
  });

  return null; // This component doesn't render anything directly
};

export default VRAvatar;