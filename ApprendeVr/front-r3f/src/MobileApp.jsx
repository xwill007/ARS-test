import { Canvas } from '@react-three/fiber'
import { XR, VRButton, Controllers, Hands } from '@react-three/xr'
import { Environment, OrbitControls, Sky } from '@react-three/drei'
import { Suspense, useState, useEffect } from 'react'

function Box({ position = [0, 0.5, -5] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  )
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#53a852" />
    </mesh>
  )
}

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
      {/* Luces */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      {/* Cielo */}
      <Sky 
        distance={450000}
        sunPosition={[0, 1, 0]}
        inclination={0}
        azimuth={0.25}
      />

      {/* Elementos de la escena */}
      <Box />
      <Floor />

      {/* Controles */}
      <OrbitControls 
        enableZoom={true}
        enablePan={false}
        enableDamping={true}
        makeDefault
        maxPolarAngle={Math.PI / 2}
        minDistance={2}
        maxDistance={20}
      />
    </>
  )
}

function MobileApp() {
  return (
    <>
      <VRButton className="vr-button" />
      <Canvas shadows>
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