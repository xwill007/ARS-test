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
      style={{
        width,
        height,
        background: '#111',
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
        ...style
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute',
          width: `${zoom * 100}%`,
          height: `${zoom * 100}%`,
          left: offset,
          top: 0,
          objectFit: 'cover',
          zIndex: 1,
          transition: 'width 0.2s, height 0.2s, left 0.2s',
        }}
      />
      {/* Overlay 3D/A-Frame/R3F */}
      <div style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, zIndex: 2, pointerEvents: 'none' }}>
        {renderOverlay()}
      </div>
      {/* Cursor central visual */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 18,
          height: 18,
          pointerEvents: 'none',
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            border: '2px solid #fff',
            background: 'rgba(255,255,255,0.08)',
            boxShadow: '0 0 8px #fff8',
            transition: 'all 0.2s',
          }}
        />
      </div>
    </div>
  );
});

export default ARPanel;
