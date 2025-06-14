import { useState } from 'react'
import { Text } from '@react-three/drei'

function VRButton({ 
  position = [0, 1.5, -2],
  rotation = [0, 0, 0],
  scale = 0.5,
  text = "VR",
  onClick
}) {
  const [hovered, setHovered] = useState(false)

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      console.log('VR Button clicked')
    }
  }

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh>
        <boxGeometry args={[2, 0.7, 0.1]} />
        <meshStandardMaterial 
          color={hovered ? '#2196f3' : '#1976d2'} 
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>
      <Text
        position={[0, 0, 0.06]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {text}
      </Text>
    </group>
  )
}

export default VRButton