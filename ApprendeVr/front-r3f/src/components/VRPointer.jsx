import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useXR } from '@react-three/xr'
import * as THREE from 'three'

function VRPointer() {
  const { isPresenting } = useXR()
  const { camera } = useThree()
  const pointerRef = useRef()
  
  useFrame(() => {
    if (!pointerRef.current) return

    // Calcular la posición del cursor frente a la cámara
    const position = new THREE.Vector3(0, 0, -3)
    position.applyMatrix4(camera.matrixWorld)
    
    pointerRef.current.position.copy(position)
  })

  if (!isPresenting) return null

  return (
    <mesh ref={pointerRef}>
      <sphereGeometry args={[0.03]} />
      <meshBasicMaterial 
        color="#ff0000"
        transparent
        opacity={0.8}
      />
    </mesh>
  )
}

export default VRPointer