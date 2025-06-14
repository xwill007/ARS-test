import { Canvas } from '@react-three/fiber'
import { XR, VRButton, Controllers, Hands } from '@react-three/xr'
import { Environment, OrbitControls } from '@react-three/drei'
import { Suspense, useState, useEffect } from 'react'

function MobileScene() {
  const [hasPermission, setHasPermission] = useState(false)

  useEffect(() => {
    const requestPermission = async () => {
      if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
        try {
          const permission = await DeviceOrientationEvent.requestPermission()
          setHasPermission(permission === 'granted')
        } catch (error) {
          console.error('Error de permisos:', error)
        }
      } else {
        setHasPermission(true)
      }
    }

    requestPermission()
  }, [])

  return (
    <>
      <Environment preset="sunset" />
      <ambientLight intensity={0.5} />
      <mesh position={[0, 0, -5]}>
        <boxGeometry />
        <meshStandardMaterial color="orange" />
      </mesh>
      <OrbitControls 
        enableZoom={true}
        enablePan={false}
        enableDamping={true}
        makeDefault
      />
    </>
  )
}

function MobileApp() {
  return (
    <>
      <VRButton className="vr-button" />
      <Canvas>
        <XR>
          <Controllers />
          <Hands />
          <Suspense fallback={null}>
            <MobileScene />
          </Suspense>
        </XR>
      </Canvas>
    </>
  )
}

export default MobileApp