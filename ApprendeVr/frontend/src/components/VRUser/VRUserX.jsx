import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useXR } from '@react-three/xr'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

function VRUser({ initialPosition = [0, 0, 0] }) {
  const { isPresenting } = useXR()
  const userRef = useRef()
  const { camera } = useThree()
  const userHeight = 1.6

  useEffect(() => {
    if (isPresenting) {
      // Configuración para VR/móvil
      camera.position.set(
        initialPosition[0],
        initialPosition[1] + userHeight,
        initialPosition[2]
      )
    } else {
      // Configuración para PC - Vista tercera persona
      const thirdPersonOffset = new THREE.Vector3(0, 2, 4)
      camera.position.set(
        initialPosition[0] + thirdPersonOffset.x,
        initialPosition[1] + thirdPersonOffset.y,
        initialPosition[2] + thirdPersonOffset.z
      )
    }

    const targetPosition = new THREE.Vector3(
      initialPosition[0],
      initialPosition[1] + userHeight/2,
      initialPosition[2]
    )
    camera.lookAt(targetPosition)
    camera.updateProjectionMatrix()
  }, [isPresenting]) // Actualizar cuando cambie el modo de visualización

  useFrame(() => {
    if (!userRef.current) return
    
    // Ajustar posición del cilindro según el modo
    if (isPresenting) {
      // En VR/móvil, el cilindro va detrás de la cámara
      userRef.current.position.set(
        camera.position.x,
        initialPosition[1] + userHeight/2,
        camera.position.z - 2 // 2 unidades detrás de la cámara
      )
    } else {
      // En PC, el cilindro mantiene su posición inicial
      userRef.current.position.set(
        initialPosition[0],
        initialPosition[1] + userHeight/2,
        initialPosition[2]
      )
    }
  })

  return (
    <group>
      <mesh ref={userRef}>
        <cylinderGeometry args={[0.3, 0.3, userHeight, 32]} />
        <meshStandardMaterial 
          color="#1e88e5"
          metalness={0.2}
          roughness={0.8}
          side={THREE.DoubleSide}
          transparent={true}
          opacity={0.9}
        />
      </mesh>

      {/* Controles solo para PC */}
      {!isPresenting && (
        <OrbitControls 
          enableDamping
          dampingFactor={0.05}
          minDistance={3}
          maxDistance={10}
          minPolarAngle={0}
          maxPolarAngle={Math.PI/1.5}
          enableRotate={true}
          rotateSpeed={0.5}
          target={[
            initialPosition[0],
            initialPosition[1] + userHeight/2,
            initialPosition[2]
          ]}
        />
      )}
    </group>
  )
}

export default VRUser