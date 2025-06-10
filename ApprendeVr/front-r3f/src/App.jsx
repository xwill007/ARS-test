import React from 'react'
import VRDado from './components/VRWorld/VRDado'
import VRWorld from './components/VRWorld/VRWorld'
import VRUser from './components/VRUser/VRUser'; // Import VRUser
import './App.css'
import './config/theme.css';
import { Canvas } from '@react-three/fiber';
import Girl from './components/VRGirl/VRGirl'; // Import Girl
import { Physics } from '@react-three/rapier';

const App = () => {
  const boxSize1 = [1, 1, 1];
  const boxPosition1 = [1, 2, -1];

  return (
    <div style={{ height: '100vh' }}>
      <h1>Apprende VR</h1>
      <Canvas>
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        <Physics>
          <VRDado size={boxSize1} position={boxPosition1} />
          <VRWorld diameter={90} position={[0, 0, 0]} />
          <VRUser initialPosition={[0, 1, 0]} initialRotation={[0, Math.PI / 1, 0]}/> {/* Add VRUser component */}
          <Girl position={[0, 0, 0]} scale={1.0} /> {/* Add Girl component */}
        </Physics>
      </Canvas>
    </div>
  )
}

export default App
