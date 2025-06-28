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
  const [selectedOverlays, setSelectedOverlays] = useState(['VRConeOverlay']); // Array de overlays seleccionados
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

  // Crear múltiples overlays basados en la selección
  const createMultipleOverlays = (overlayTypes, renderKey) => {
    const r3fComponents = [];
    const htmlComponents = [];

    overlayTypes.forEach((type, index) => {
      const overlay = createOverlay(type, `${type}-${renderKey}-${index}`);
      if (overlay.type === 'r3f') {
        r3fComponents.push(overlay.component);
      } else if (overlay.type === 'html') {
        htmlComponents.push(overlay.component);
      }
    });

    return {
      r3f: r3fComponents,
      html: htmlComponents
    };
  };

  // Actualizar renderKey cuando cambien los overlays seleccionados
  useEffect(() => {
    setRenderKey(prev => prev + 1);
    console.log('Overlays changed to:', selectedOverlays);
  }, [selectedOverlays]);

  const overlaysObj = createMultipleOverlays(selectedOverlays, renderKey);

  // Lista de overlays para el componente ARSoverlayList
  const overlays = {
    TestR3FOverlay: { type: 'r3f' },
    VRConeOverlay: { type: 'html' },
    VRConeR3FOverlay: { type: 'r3f' }
  };

  console.log('Current overlays:', selectedOverlays, 'Render key:', renderKey);

  const handleOverlayChange = (overlayType, isSelected) => {
    console.log('Toggle overlay:', overlayType, 'Selected:', isSelected);
    
    if (isSelected) {
      // Agregar overlay si no está ya seleccionado
      if (!selectedOverlays.includes(overlayType)) {
        setSelectedOverlays(prev => [...prev, overlayType]);
      }
    } else {
      // Remover overlay
      setSelectedOverlays(prev => prev.filter(overlay => overlay !== overlayType));
    }
  };

  const handleARStatusChange = (status) => {
    setIsARActive(status);
    console.log('AR Status changed:', status);
  };

  // Combinar todos los componentes para pasar a ARSExperience
  const combinedOverlays = {
    r3f: overlaysObj.r3f,
    html: overlaysObj.html
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
            initialPosition={[0, 0, 0]}
            showAvatar={false}
            enableMovement={true}
            enableCursor={true}
            moveSpeed={0.1}
          >
            {/* Renderizar todos los overlays R3F */}
            {overlaysObj.r3f.map((component, index) => (
              <React.Fragment key={index}>
                {component}
              </React.Fragment>
            ))}
          </VRUserArs>
        </VRWorldArs>
      </Canvas>

      {/* Overlays HTML superpuestos */}
      {overlaysObj.html.length > 0 && (
        <div className="ars-html-overlay">
          {overlaysObj.html.map((component, index) => (
            <React.Fragment key={index}>
              {component}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Controles de overlay */}
      {!isARActive && (
        <div className="ars-controls">
          <ARSoverlayList 
            selectedOverlays={selectedOverlays} // Cambiar a array
            onOverlayToggle={handleOverlayChange} // Nueva función para toggle
            overlays={overlays}
          />
        </div>
      )}
      
      {/* Botón AR */}
      <ARSExperience
        floatingButtonProps={{ bottom: 32, right: 32, scale: 1 }}
        overlays={combinedOverlays} // Pasar múltiples overlays
        onARStatusChange={handleARStatusChange}
      />
    </div>
  );
};

export default ARSApp;