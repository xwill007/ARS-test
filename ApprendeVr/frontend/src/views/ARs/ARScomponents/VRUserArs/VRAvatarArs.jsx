import React, { useRef, useEffect, useState, memo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Vector3 } from 'three';

const VRAvatarArsComponent = ({ 
  position = new Vector3(0, 0, 0), 
  scale = 1.0, 
  rotation = [0, 0, 0],
  modelPath = '/models/PointsMen.glb'
}) => {
  const { scene } = useThree();
  const avatarRef = useRef(null);
  const [avatar, setAvatar] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loader = new GLTFLoader();
    setIsLoading(true);

    loader.load(
      modelPath,
      (gltf) => {
        const loadedAvatar = gltf.scene;
        setAvatar(loadedAvatar);
        avatarRef.current = loadedAvatar;
        scene.add(loadedAvatar);
        
        // Configurar avatar
        loadedAvatar.scale.set(scale, scale, scale);
        loadedAvatar.position.copy(position);
        loadedAvatar.rotation.set(...rotation);
        
        // Agregar userData para identificación
        loadedAvatar.userData.isAvatar = true;
        loadedAvatar.userData.interactive = false;
        
        setIsLoading(false);
        console.log('VRAvatarArs: Avatar loaded successfully');
      },
      (progress) => {
        console.log('VRAvatarArs: Loading progress:', progress);
      },
      (error) => {
        console.error('VRAvatarArs: Error loading avatar:', error);
        setIsLoading(false);
        
        // Crear avatar de respaldo (cilindro simple)
        createFallbackAvatar();
      }
    );

    return () => {
      if (avatar) {
        scene.remove(avatar);
        setAvatar(null);
        avatarRef.current = null;
      }
    };
  }, [scene, modelPath, scale]);

  const createFallbackAvatar = () => {
    // Crear un avatar simple como respaldo
    const fallbackAvatar = new THREE.Group();
    
    // Cuerpo
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.6, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: '#1e88e5' });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.8;
    
    // Cabeza
    const headGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ color: '#ffdbac' });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.8;
    
    fallbackAvatar.add(body);
    fallbackAvatar.add(head);
    fallbackAvatar.userData.isAvatar = true;
    fallbackAvatar.userData.isFallback = true;
    
    setAvatar(fallbackAvatar);
    avatarRef.current = fallbackAvatar;
    scene.add(fallbackAvatar);
  };

  useFrame(() => {
    if (avatarRef.current) {
      avatarRef.current.position.copy(position);
      avatarRef.current.rotation.set(...rotation);
    }
  });

  // Componente de estado de carga (opcional)
  if (isLoading) {
    return (
      <mesh position={position}>
        <sphereGeometry args={[0.1]} />
        <meshBasicMaterial color="#ffff00" transparent opacity={0.5} />
      </mesh>
    );
  }

  return null;
};

const areEqual = (prevProps, nextProps) => {
  return (
    prevProps.position.equals(nextProps.position) && 
    prevProps.scale === nextProps.scale &&
    prevProps.rotation[0] === nextProps.rotation[0] &&
    prevProps.rotation[1] === nextProps.rotation[1] &&
    prevProps.rotation[2] === nextProps.rotation[2] &&
    prevProps.modelPath === nextProps.modelPath
  );
};

const VRAvatarArs = memo(VRAvatarArsComponent, areEqual);

export default VRAvatarArs;