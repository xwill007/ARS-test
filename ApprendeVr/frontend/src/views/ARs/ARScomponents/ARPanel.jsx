import React, { forwardRef } from 'react';
import { Canvas } from '@react-three/fiber';
import OptimizedOverlayWrapper from './overlays/OptimizedOverlayWrapper';

/**
 * ARPanel
 * Panel para una vista (ojo) en modo AR estereoscópico.
 * Props:
 *  - videoRef: ref del video HTML5
 *  - width, height: tamaño en px
 *  - overlay: componente React a superponer (ej: <VRDomo /> o R3F)
 *  - overlayType: 'r3f' | 'html' (opcional, para forzar Canvas)
 *  - style: estilos extra
 *  - isPrimaryPanel: si es el panel principal (para optimizaciones)
 *  - isRightPanel: si es el panel derecho
 *  - optimizationSettings: configuraciones de optimización
 */
const showLogs = true; // Cambia a false para desactivar logs

const ARPanel = forwardRef(({ 
  videoRef, 
  width, 
  height, 
  overlay, 
  overlayType, 
  style = {}, 
  zoom = 1, 
  cameraZoom = 1, 
  offset = 0,
  isPrimaryPanel = false,
  isRightPanel = false,
  showCursor = true, // Cursor del panel (div visual)
  showOverlayCursor = true, // Cursor de los overlays (A-Frame/R3F)
  optimizationSettings = {}
}, ref) => {
  const { optimizeStereo = false, mirrorRightPanel = false, muteRightPanel = true } = optimizationSettings;
  
  if (showLogs) console.log('[ARPanel] Configuración:', {
    isPrimaryPanel,
    isRightPanel,
    showCursor,
    showOverlayCursor,
    optimizeStereo,
    mirrorRightPanel,
    muteRightPanel,
    overlayType,
    overlay: !!overlay
  });
  
  // Lógica de optimización para panel derecho
  const shouldSkipOverlay = isRightPanel && optimizeStereo && mirrorRightPanel;
  const shouldMuteAudio = isRightPanel && optimizeStereo && muteRightPanel;
  
  if (showLogs && isRightPanel && optimizeStereo) {
    console.log('[ARPanel] Panel derecho optimizado:', {
      skipOverlay: shouldSkipOverlay,
      muteAudio: shouldMuteAudio
    });
  }
  if (showLogs) console.log('[ARPanel] overlayType:', overlayType, 'overlay:', overlay);
  // Si overlayType es 'r3f', renderizar overlay dentro de un Canvas embebido
  const renderOverlay = () => {
    if (showLogs) console.log('[ARPanel] renderOverlay called, overlayType:', overlayType, 'overlay:', overlay);
    
    // Si es panel derecho en modo espejo, mostrar mensaje de optimización
    if (shouldSkipOverlay) {
      if (showLogs) console.log('[ARPanel] Panel derecho optimizado - usando espejo del panel izquierdo');
      return (
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          color: 'rgba(255,255,255,0.7)',
          fontSize: '12px',
          textAlign: 'center',
          padding: '4px 8px',
          background: 'rgba(0,0,0,0.5)',
          borderRadius: '4px',
          zIndex: 10
        }}>
          🪞 Panel Espejo<br/>
          <span style={{ fontSize: '10px' }}>Optimizado</span>
        </div>
      );
    }
    
    // Si no hay overlay, no renderizar nada
    if (!overlay) {
      if (showLogs) console.log('[ARPanel] No hay overlay para renderizar');
      return null;
    }
    
    // Si overlay es un array, renderizar todos los elementos
    if (Array.isArray(overlay)) {
      if (showLogs) console.log('[ARPanel] Renderizando múltiples overlays:', overlay.length);
      
      // Si el array está vacío, no renderizar nada
      if (overlay.length === 0) {
        if (showLogs) console.log('[ARPanel] Array de overlays vacío');
        return null;
      }
      
      // Separar overlays por tipo - mejorada la detección
      const r3fOverlays = [];
      const htmlOverlays = [];
      
      overlay.forEach((singleOverlay, index) => {
        // Verificar si es un componente R3F válido
        const isR3FComponent = singleOverlay?.type && 
          typeof singleOverlay.type === 'function' && 
          !singleOverlay.type.toString().includes('iframe') &&
          !singleOverlay.type.toString().includes('a-') &&
          !singleOverlay.type.toString().includes('VRConeOverlay');
        
        if (isR3FComponent) {
          // Es un componente R3F válido - pasar showOverlayCursor si el componente lo acepta
          const overlayProps = { key: `r3f-${index}` };
          if (singleOverlay.type.name === 'VRLocalVideoOverlay' || 
              singleOverlay.props?.showCursor !== undefined) {
            overlayProps.showCursor = showOverlayCursor;
          }
          r3fOverlays.push(React.cloneElement(singleOverlay, overlayProps));
        } else {
          // Es HTML/A-Frame o componente con iframe - pasar showOverlayCursor si el componente lo acepta
          const overlayProps = { key: `html-${index}` };
          if (singleOverlay.type.name === 'VRLocalVideoOverlay' || 
              singleOverlay.props?.showCursor !== undefined) {
            overlayProps.showCursor = showOverlayCursor;
          }
          htmlOverlays.push(React.cloneElement(singleOverlay, overlayProps));
        }
      });
      
      if (showLogs) console.log('[ARPanel] Separados - R3F:', r3fOverlays.length, 'HTML:', htmlOverlays.length);
      
      return (
        <>
          {/* Renderizar overlays HTML */}
          {htmlOverlays.length > 0 && (
            <div style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }}>
              {htmlOverlays}
            </div>
          )}
          
          {/* Renderizar overlays R3F en Canvas solo si hay elementos válidos */}
          {r3fOverlays.length > 0 && (
            <div style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }}>
              <Canvas 
                style={{ width: '100%', height: '100%', pointerEvents: 'none', background: 'transparent' }} 
                camera={{ position: [0, 0, 2] }}
                onCreated={({ gl }) => {
                  // Configurar el contexto WebGL para evitar conflictos
                  gl.setClearColor(0x000000, 0);
                  gl.setClearAlpha(0);
                }}
              >
                <ambientLight intensity={0.7} />
                <pointLight position={[2, 2, 2]} />
                {r3fOverlays}
              </Canvas>
            </div>
          )}
        </>
      );
    }
    
    // Comportamiento original para un solo overlay
    if ((overlayType === 'r3f' || overlayType === 'mixed') && overlay) {
      // Verificar si es un componente R3F válido
      const isR3FComponent = overlay?.type && 
        typeof overlay.type === 'function' && 
        !overlay.type.toString().includes('iframe') &&
        !overlay.type.toString().includes('a-') &&
        !overlay.type.toString().includes('VRConeOverlay');
      
      if (isR3FComponent) {
        if (showLogs) console.log('[ARPanel] Renderizando overlay individual en Canvas (R3F)');
        // Pasar showOverlayCursor si el componente lo acepta
        const enhancedOverlay = (overlay.type.name === 'VRLocalVideoOverlay' || 
                                overlay.props?.showCursor !== undefined) 
          ? React.cloneElement(overlay, { showCursor: showOverlayCursor })
          : overlay;
        
        return (
          <Canvas 
            style={{ width: '100%', height: '100%', pointerEvents: 'none', background: 'transparent' }} 
            camera={{ position: [0, 0, 2] }}
            onCreated={({ gl }) => {
              gl.setClearColor(0x000000, 0);
              gl.setClearAlpha(0);
            }}
          >
            <ambientLight intensity={0.7} />
            <pointLight position={[2, 2, 2]} />
            {enhancedOverlay}
          </Canvas>
        );
      }
    }
    if (showLogs) console.log('[ARPanel] Renderizando overlay como HTML/A-Frame');
    // Si es HTML/A-Frame, renderizar tal cual pero pasar showOverlayCursor si el componente lo acepta
    if (overlay.type.name === 'VRLocalVideoOverlay' || 
        overlay.props?.showCursor !== undefined) {
      return React.cloneElement(overlay, { showCursor: showOverlayCursor });
    }
    return overlay;
  };

  return (
    <div
      ref={ref}
      className="ar-panel"
      style={{
        width,
        height,
        ...style
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={shouldMuteAudio} // Silenciar si está en modo optimización
        className="ar-video"
        style={{
          position: 'absolute',
          width: `${zoom * 100}%`,
          height: `${zoom * 100}%`,
          left: offset,
          top: 0,
          objectFit: 'cover',
          zIndex: 1,
        }}
      />
      {/* Overlay 3D/A-Frame/R3F */}
      <div style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, zIndex: 2, pointerEvents: 'none' }}>
        <OptimizedOverlayWrapper 
          isPrimaryPanel={isPrimaryPanel}
          optimizationSettings={optimizationSettings}
        >
          {renderOverlay()}
        </OptimizedOverlayWrapper>
      </div>
      {/* Punto mínimo de referencia visual (siempre visible) */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 4,
          height: 4,
          background: 'rgba(255, 255, 255, 0.3)',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />
      {/* Cursor central visual eliminado - solo usamos el cursor del overlay */}
    </div>
  );
});

export default ARPanel;
