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
import ARSOverlayCounter from './ARScomponents/ARSOverlayCounter';

const ARSApp = () => {
  const [selectedOverlays, setSelectedOverlays] = useState(['VRConeOverlay']);
  const [renderKey, setRenderKey] = useState(0);
  const [isARActive, setIsARActive] = useState(false);

  // Función para crear los overlays dinámicamente
  const createOverlays = (types, keys) => {
    const overlayComponents = {
      html: [],
      r3f: []
    };

    types.forEach((type, index) => {
      const key = keys[index];
      switch (type) {
        case 'TestR3FOverlay':
          overlayComponents.r3f.push(
            <TestR3FOverlay key={key} />
          );
          break;
        case 'VRConeOverlay':
          overlayComponents.html.push(
            <VRConeOverlayWrapper 
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
          );
          break;
        case 'VRConeR3FOverlay':
          overlayComponents.r3f.push(
            <VRConeR3FOverlay key={key} />
          );
          break;
        default:
          break;
      }
    });

    return overlayComponents;
  };

  // Actualizar renderKey cuando cambie selectedOverlays
  useEffect(() => {
    setRenderKey(prev => prev + 1);
    console.log('Overlays changed to:', selectedOverlays);
  }, [selectedOverlays]);

  const overlayKeys = selectedOverlays.map((overlay, index) => `${overlay}-${renderKey}-${index}`);
  const overlayComponents = createOverlays(selectedOverlays, overlayKeys);

  // Lista de overlays para el componente ARSoverlayList
  const overlays = {
    TestR3FOverlay: { type: 'r3f' },
    VRConeOverlay: { type: 'html' },
    VRConeR3FOverlay: { type: 'r3f' }
  };

  console.log('Current overlays:', selectedOverlays, 'Render key:', renderKey);

  const handleOverlayToggle = (overlayKey) => {
    console.log('Toggling overlay:', overlayKey);
    setSelectedOverlays(prev => {
      if (prev.includes(overlayKey)) {
        // Remover el overlay si ya está seleccionado
        return prev.filter(overlay => overlay !== overlayKey);
      } else {
        // Agregar el overlay si no está seleccionado
        return [...prev, overlayKey];
      }
    });
  };

  const handleClearAllOverlays = () => {
    console.log('Clearing all overlays');
    setSelectedOverlays([]);
  };

  const handleARStatusChange = (status) => {
    setIsARActive(status);
    console.log('AR Status changed:', status);
  };

  // Preparar overlays para AR - solo si hay overlays seleccionados
  const prepareOverlaysForAR = () => {
    if (selectedOverlays.length === 0) {
      return null;
    }
    
    const allOverlays = [...overlayComponents.html, ...overlayComponents.r3f];
    return allOverlays.length > 0 ? allOverlays : null;
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
            {overlayComponents.r3f}
          </VRUserArs>
        </VRWorldArs>
      </Canvas>

      {/* Overlay HTML superpuesto */}
      {overlayComponents.html.length > 0 && (
        <div className="ars-html-overlay">
          {overlayComponents.html}
        </div>
      )}

      {/* Controles de overlay */}
      {!isARActive && (
        <div className="ars-controls">
          <ARSoverlayList 
            selectedOverlays={selectedOverlays}
            setSelectedOverlay={handleOverlayToggle}
            overlays={overlays}
            multiSelect={true}
          />
          {selectedOverlays.length > 0 && (
            <button
              onClick={handleClearAllOverlays}
              style={{
                marginTop: '10px',
                padding: '6px 12px',
                background: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#cc0000';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = '#ff4444';
                e.target.style.transform = 'scale(1)';
              }}
            >
              🗑️ Limpiar todo
            </button>
          )}
        </div>
      )}
      
      {/* Contador de overlays activos */}
      <ARSOverlayCounter selectedOverlays={selectedOverlays} />
      
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