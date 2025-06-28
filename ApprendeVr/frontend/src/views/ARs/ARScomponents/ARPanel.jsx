import React, { forwardRef } from 'react';
import { Canvas } from '@react-three/fiber';

/**
 * ARPanel
 * Panel para una vista (ojo) en modo AR estereoscópico.
 * Props:
 *  - videoRef: ref del video HTML5
 *  - width, height: tamaño en px
 *  - overlay: componente React a superponer (ej: <VRDomo /> o R3F)
 *  - overlayType: 'r3f' | 'html' (opcional, para forzar Canvas)
 *  - style: estilos extra
 */
const showLogs = true; // Cambia a false para desactivar logs

const ARPanel = forwardRef(({ videoRef, width, height, overlay, overlayType, style = {}, zoom = 1, offset = 0 }, ref) => {
  if (showLogs) console.log('[ARPanel] overlayType:', overlayType, 'overlay:', overlay);
  // Si overlayType es 'r3f', renderizar overlay dentro de un Canvas embebido
  const renderOverlay = () => {
    if (showLogs) console.log('[ARPanel] renderOverlay called, overlayType:', overlayType);
    if (overlayType === 'r3f' && overlay) {
      if (showLogs) console.log('[ARPanel] Renderizando overlay en Canvas (R3F)');
      // Canvas embebido con cámara y luz propia
      return (
        <Canvas style={{ width: '100%', height: '100%', pointerEvents: 'none', background: 'transparent' }} camera={{ position: [0, 0, 2] }}>
          <ambientLight intensity={0.7} />
          <pointLight position={[2, 2, 2]} />
          {overlay}
        </Canvas>
      );
    }
    if (showLogs) console.log('[ARPanel] Renderizando overlay como HTML/A-Frame');
    // Si es HTML/A-Frame, renderizar tal cual
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
        muted
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
        {renderOverlay()}
      </div>
      {/* Cursor central visual mejorado */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 20,
          height: 20,
          pointerEvents: 'none',
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="ar-cursor" style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }} />
      </div>
    </div>
  );
});

export default ARPanel;
