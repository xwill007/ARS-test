import { useFrame, useThree } from '@react-three/fiber';

const VRCamera = ({ userPosition, rotation }) => {
  const { camera, gl } = useThree();

  useFrame(() => {
    // Set camera position to follow the user
    camera.position.set(
      userPosition.current.x,
      userPosition.current.y + 1.7, // Camera slightly above the user
      userPosition.current.z - 0.5  // Camera a bit behind the user
    );

    camera.rotation.set(rotation.x, rotation.y, 0); // Apply rotation
  });

  return (
      <perspectiveCamera fov={75} aspect={gl.domElement.clientWidth / gl.domElement.clientHeight} near={0.1} far={1000} />
  );
};

export default VRCamera;