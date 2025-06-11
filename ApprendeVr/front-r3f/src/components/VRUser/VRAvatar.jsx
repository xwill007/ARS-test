import React, { useRef, useEffect, useState, memo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Vector3 } from 'three';
import { showLogs } from '../../config/config'; // Import showLogs

const VRAvatarComponent = ({ position = new Vector3(0, 0, 0), scale = 1.0 }) => {
  const { scene } = useThree();
  const avatarRef = useRef(null);
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    if (showLogs) console.log('VRAvatar: useEffect - Mounting');
    const loader = new GLTFLoader();

    loader.load('/models/PointsMen.glb', (gltf) => {
      if (showLogs) console.log('VRAvatar: GLTFLoader - Model loaded', gltf);
      const loadedAvatar = gltf.scene;
      setAvatar(loadedAvatar);
      avatarRef.current = loadedAvatar;
      scene.add(loadedAvatar);
      loadedAvatar.scale.set(scale, scale, scale); // Set scale
      loadedAvatar.position.copy(position); // Set initial position
    }, undefined, function (error) {
      console.error(error);
    });

    return () => {
      if (showLogs) console.log('VRAvatar: useEffect - Unmounting');
      if (avatar) {
        scene.remove(avatar);
        setAvatar(null);
        avatarRef.current = null;
      }
    };
  }, [scene, position, scale]);

  useFrame(() => {
    //if (showLogs) console.log('VRAvatar: useFrame - Updating position');
    if (avatarRef.current) {
      avatarRef.current.position.copy(position);
    }
  });

  return null; // This component doesn't render anything directly
};

const areEqual = (prevProps, nextProps) => {
  // Compare the position vectors
  if (showLogs) console.log('VRAvatar: areEqual - Comparing props', prevProps, nextProps);
  const isEqual = prevProps.position.equals(nextProps.position) && prevProps.scale === nextProps.scale;
  if (showLogs) console.log('VRAvatar: areEqual - Result', isEqual);
  return isEqual;
};

const VRAvatar = memo(VRAvatarComponent, areEqual);

export default VRAvatar;