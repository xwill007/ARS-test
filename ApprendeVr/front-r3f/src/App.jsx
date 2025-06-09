import React from 'react'
import VRDado from './components/VRDado'
import VRWorld from './components/VRWorld'
import VRUser from './components/VRUser'; // Import VRUser
import './App.css'
import './theme.css';
import { Canvas } from '@react-three/fiber';

const App = () => {
  const boxSize1 = [1, 1, 1];
  const boxSize2 = [2, 2, 2];
  const boxPosition1 = [1, 2, -1];
  const boxPosition2 = [-1, 1, -1];

  return (
    <div style={{ height: '100vh' }}>
      <h1>Apprende VR</h1>
      <Canvas>
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        <VRDado size={boxSize1} position={boxPosition1} />
        <VRDado size={boxSize2} position={boxPosition2} />
        <VRWorld diameter={90} position={[0, 0, 0]} />
        <VRUser initialPosition={[0, 1, 0]}/> {/* Add VRUser component */}
      </Canvas>
    </div>
  )
}

export default App
