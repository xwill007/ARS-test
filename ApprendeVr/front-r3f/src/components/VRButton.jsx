import { useState } from 'react'
import { Text } from '@react-three/drei'
import { RoundedBox } from '@react-three/drei'

const TextLabel = ({ text, rotationY = 0 }) => (
  <Text
    fontSize={0.25}
    color="white"
    anchorX="center"
    anchorY="middle"
    rotation-y={rotationY}
    outlineWidth={0.004}
    outlineColor="#000000"
    outlineBlur={0.001}
  >
    {text}
  </Text>
)

function VRButton({ 
  position = [0, 1.5, -2],
  rotation = [0, 0, 0],
  scale = 0.5,
  text = "VR",
  navigateTo = null
}) {
  const [hovered, setHovered] = useState(false)

  const handleClick = () => {
    if (navigateTo) {
      window.location.href = navigateTo
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
      <RoundedBox
        args={[2, 0.7, 0.1]}
        radius={0.05}
        smoothness={4}
      >
        <meshStandardMaterial
          color={hovered ? '#2196f3' : '#1976d2'}
          metalness={0.1}
          roughness={0.2}
          emissive={hovered ? '#1976d2' : '#000000'}
          emissiveIntensity={0.2}
        />
      </RoundedBox>
      <group position={[0, 0, 0.051]}><TextLabel text={text} /></group>
      <group position={[0, 0, -0.051]}><TextLabel text={text} rotationY={Math.PI} /></group>
    </group>
  )
}

export default VRButton