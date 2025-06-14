import { Canvas } from '@react-three/fiber'
import { XR, VRButton, Controllers, Hands } from '@react-three/xr'
import { Environment, OrbitControls, Sky } from '@react-three/drei'
import { Suspense } from 'react'
import './mobile.css'
import VRTextTranslation from './components/VRTextTranslation'

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
  return (
    <>
      {/* Sky */}
      <Sky 
        distance={450000}
        sunPosition={[0, 1, 0]}
        inclination={0}
        azimuth={0.25}
        turbidity={10}
        rayleigh={3}
        mieCoefficient={0.005}
        mieDirectionalG={0.7}
      />

      {/* Luces */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      {/* Text Translation Card */}
      <VRTextTranslation 
        textKey="welcomeMessage"
        language1="en"
        language2="es"
        position={[0, 1.5, -3]}
        scale={1}
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

// Add custom styles for VR button
const customVRStyles = `
  .vr-button {
    background-color: #2196f3 !important;
    border: 2px solid #1976d2 !important;
    color: white !important;
    position: absolute !important;
    top: 20px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    padding: 12px 24px !important;
    border-radius: 6px !important;
    font-family: Arial, sans-serif !important;
    font-weight: bold !important;
    cursor: pointer !important;
    transition: background-color 0.3s ease !important;
    z-index: 1000 !important;
  }

  .vr-button:hover {
    background-color: #1976d2 !important;
  }

  .vr-button:disabled {
    background-color: #64b5f6 !important;
    cursor: not-allowed !important;
    opacity: 0.7 !important;
  }
`

function MobileApp() {
  return (
    <>
      <style>{customVRStyles}</style>
      <VRButton className="vr-button" />
      <Canvas shadows camera={{ position: [0, 2, 5], fov: 75 }}>
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