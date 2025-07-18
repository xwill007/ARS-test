import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import VRWorldArs from './ARScomponents/VRWorldArs/VRWorlsArs';
import ARSExperience from './ARScomponents/ARSExperience';
import VRUserArs from './ARScomponents/VRUserArs/VRUserArs';
import AROverlayController from './ARScomponents/AROverlayController';

const ARSApp = () => {
  const [isARActive, setIsARActive] = useState(false);

  // Usar el controlador de overlays - ahora reacciona automáticamente a cambios en la configuración
  const overlayController = AROverlayController({ 
    isARActive,
    initialOverlays: ['vrConeOverlay'] // Fallback si no hay configuración guardada
  });

  const {
    overlayComponents,
    prepareOverlaysForAR,
    OverlayControls,
    ConfigPanel,
    DebugPanel,
    hasHTMLOverlays,
    hasR3FOverlays
  } = overlayController;

  const handleARStatusChange = (status) => {
    setIsARActive(status);
    console.log('AR Status changed:', status);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }} className="ars-container">
      {/* Controles de overlay */}
      <OverlayControls />
      
      {/* Panel de configuración */}
      <ConfigPanel />
      
      {/* Panel de debug desactivado */}
      {/* <DebugPanel /> */}
      
      {/* Canvas con el mundo 3D en el fondo - Sin renderKey para evitar reseteos */}
      <Canvas 
        style={{ width: '100%', height: '100%' }}
        camera={{ position: [0, 2, 5], fov: 50 }}
      >
        <Sky 
          distance={450000}
          sunPosition={[0, 1, 0]}
          inclination={0}
          azimuth={0.25}
        />
        
        <ambientLight intensity={0.5} />

        <pointLight position={[10, 10, 10]} />

        <VRWorldArs floorPosition={[0, -2, 0]} floorSize={300} floorScale={[3, 3, 1]}>
          <VRUserArs 
            mode="first"
            initialPosition={[0, 0, 3]}
            showAvatar={false}
            enableMovement={true}
            enableCursor={true}
            moveSpeed={0.1}
          >
            {overlayComponents.r3f}
          </VRUserArs>
        </VRWorldArs>
      </Canvas>

      {/* Overlay HTML superpuesto - Con key estable para evitar reseteos */}
      {hasHTMLOverlays && (
        <div 
          key="html-overlay-container"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} 
          className="ars-html-overlay"
        >
          {overlayComponents.html}
        </div>
      )}

      {/* Botón AR */}
      <ARSExperience
        floatingButtonProps={{ bottom: 32, right: 32, scale: 1 }}
        overlay={prepareOverlaysForAR()}
        overlayType="mixed"
        onARStatusChange={handleARStatusChange}
      />
    </div>
  );
};

export default ARSApp;