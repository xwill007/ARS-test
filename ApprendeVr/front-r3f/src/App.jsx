import React from 'react'
import VRDado from './components/VRWorld/VRDado'
import VRWorld from './components/VRWorld/VRWorld'
import VRUser from './components/VRUser/VRUser'; // Import VRUser
import './App.css'
import './config/theme.css';
import { Canvas } from '@react-three/fiber';
import Girl from './components/VRGirl/VRGirl'; // Import Girl
import Men from './components/VRUser/VRAvatar'; 
import { Physics } from '@react-three/rapier';

const App = () => {
  const boxSize1 = [0.5, 0.5, 0.5];
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
          <VRUser initialPosition={[0, 0, -1]} initialRotation={[0, Math.PI / 1, 0]}/> 
          <Girl position={[2, 0, 5]} scale={1.0} /> 
          
        </Physics>
      </Canvas>
    </div>
  )
}

export default App
