import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import VRWorldArs from './ARScomponents/VRWorldArs/VRWorlsArs';
import ARSExperience from './ARScomponents/ARSExperience';
import TestR3FOverlay from './ARScomponents/ARStest/TestR3FOverlay';
import VRConeOverlayWrapper from './ARScomponents/a-frame-components-ars/VRConeOverlayWrapper';
import VRConeR3FOverlay from './ARScomponents/ARStest/VRConeR3FOverlay';
import VRUserArs from './ARScomponents/VRUserArs/VRUserArs';
import ARSoverlayList from './ARScomponents/ARSoverlayList';

const ARSApp = () => {
  const [selectedOverlay, setSelectedOverlay] = useState('VRConeOverlay');
  const [renderKey, setRenderKey] = useState(0);
  const [isARActive, setIsARActive] = useState(false);

  // Función para crear los overlays dinámicamente
  const createOverlay = (type, key) => {
    switch (type) {
      case 'TestR3FOverlay':
        return {
          type: 'r3f',
          component: <TestR3FOverlay key={key} />
        };
      case 'VRConeOverlay':
        return {
          type: 'html',
          component: <VRConeOverlayWrapper 
            key={key}
            radiusBase={6} 
            height={6} 
            showUserMarker={true}
            targetObjectId="user-marker"
            targetObjectType="sphere"
            targetObjectProps={{
              position: "0 0.15 0",
              radius: 0.15,
              color: "#FF0000",
              opacity: 0.7
            }}
            lookAtTarget={true}
            targetPosition={[0, 0.15, 0]}
          />
        };
      case 'VRConeR3FOverlay':
        return {
          type: 'r3f',
          component: <VRConeR3FOverlay key={key} />
        };
      default:
        return {
          type: 'html',
          component: <div key={key}>No overlay selected</div>
        };
    }
  };

  // Actualizar renderKey cuando cambie selectedOverlay
  useEffect(() => {
    setRenderKey(prev => prev + 1);
    console.log('Overlay changed to:', selectedOverlay);
  }, [selectedOverlay]);

  const overlayObj = createOverlay(selectedOverlay, `${selectedOverlay}-${renderKey}`);

  // Lista de overlays para el componente ARSoverlayList
  const overlays = {
    TestR3FOverlay: { type: 'r3f' },
    VRConeOverlay: { type: 'html' },
    VRConeR3FOverlay: { type: 'r3f' }
  };

  console.log('Current overlay:', selectedOverlay, 'Render key:', renderKey);

  const handleOverlayChange = (newOverlay) => {
    console.log('Setting overlay to:', newOverlay);
    if (newOverlay !== selectedOverlay) {
      setSelectedOverlay(newOverlay);
    }
  };

  const handleARStatusChange = (status) => {
    setIsARActive(status);
    console.log('AR Status changed:', status);
  };

  return (
    <div key={renderKey} className="ars-container">
      {/* Canvas con el mundo 3D en el fondo */}
      <Canvas 
        camera={{ position: [0, 2, 5], fov: 75 }}
        className="ars-canvas"
      >
        <Sky sunPosition={[100, 10, 100]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <VRWorldArs>
          <VRUserArs 
            mode="first"
            initialPosition={[0, 0, 3]}
            showAvatar={false}
            enableMovement={true}
            enableCursor={true}
            moveSpeed={0.1}
          >
            {overlayObj.type === 'r3f' && overlayObj.component}
          </VRUserArs>
        </VRWorldArs>
      </Canvas>

      {/* Overlay HTML superpuesto */}
      {overlayObj.type === 'html' && (
        <div className="ars-html-overlay">
          {overlayObj.component}
        </div>
      )}

      {/* Controles de overlay */}
      {!isARActive && (
        <div className="ars-controls">
          <ARSoverlayList 
            selectedOverlay={selectedOverlay}
            setSelectedOverlay={handleOverlayChange}
            overlays={overlays}
          />
        </div>
      )}
      
      {/* Botón AR */}
      <ARSExperience
        floatingButtonProps={{ bottom: 32, right: 32, scale: 1 }}
        overlay={overlayObj.component}
        overlayType={overlayObj.type}
        onARStatusChange={handleARStatusChange}
      />
    </div>
  );
};

export default ARSApp;