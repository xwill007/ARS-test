import { Canvas } from '@react-three/fiber'
import { XR, VRButton } from '@react-three/xr'
import { Environment, Sky } from '@react-three/drei'
import { Suspense } from 'react'
import VRTextTranslation from './components/VRTextTranslation'
import VRUser from './components/VRUser'
import VideoBox from './components/VideoBox'
import './mobile.css'

let pantalla_x = 12.80;
let pantalla_y = 10.24;
let pantalla_z = 0.3;


function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="grey" />
    </mesh>
  )
}

function MobileScene() {
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[1, 1, 1]} intensity={1.5} />
      
      <Sky 
        distance={450000}
        sunPosition={[0, 1, 0]}
        inclination={0}
        azimuth={0.25}
      />
      <Environment preset="sunset" />

      <VRTextTranslation 
        textKey="welcomeMessage"
        language1="en"
        language2="es"
        position={[0, 1.5, -3]}
        scale={1}
      />

      <VideoBox 
        position={[0, 1.5, 0]}
        width={6}
        scale={3.5}
      />

      <Floor />
      
      {/* VRUser manages camera and controls */}
      <VRUser initialPosition={[0, 0, 3]} />
    </>
  )
}

function MobileApp() {
  return (
    <div className="canvas-container">
      <VRButton className="vr-button" />
      <Canvas shadows>
        <XR>
          <Suspense fallback={null}>
            <MobileScene />
          </Suspense>
        </XR>
      </Canvas>
    </div>
  )
}

export default MobileApp