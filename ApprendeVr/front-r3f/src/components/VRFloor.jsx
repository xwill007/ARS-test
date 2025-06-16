import { useTexture } from '@react-three/drei'
import { RepeatWrapping } from 'three'

function VRFloor({ 
  size = [100, 100],
  position = [0, 0, 0],
  textureRepeat = [50, 50],
  roughness = 0.8,
  metalness = 0.2
}) {
  const floorTexture = useTexture('/images/piso_ajedrez.jpg')
  
  // Configurar la textura para que se repita
  floorTexture.wrapS = RepeatWrapping
  floorTexture.wrapT = RepeatWrapping
  floorTexture.repeat.set(...textureRepeat)

  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={position} 
      receiveShadow
    >
      <planeGeometry args={size} />
      <meshStandardMaterial 
        map={floorTexture}
        roughness={roughness}
        metalness={metalness}
      />
    </mesh>
  )
}

export default VRFloor
