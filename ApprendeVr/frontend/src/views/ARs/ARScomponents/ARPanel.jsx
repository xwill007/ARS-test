import React, { forwardRef } from 'react';

/**
 * ARPanel
 * Panel para una vista (ojo) en modo AR estereoscópico.
 * Props:
 *  - videoRef: ref del video HTML5
 *  - width, height: tamaño en px
 *  - overlay: componente React a superponer (ej: <VRDomo />)
 *  - style: estilos extra
 */
const ARPanel = forwardRef(({ videoRef, width, height, overlay, style = {}, zoom = 1, offset = 0 }, ref) => (
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
    {/* Overlay 3D/A-Frame */}
    <div style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, zIndex: 2, pointerEvents: 'none' }}>
      {overlay}
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
));

export default ARPanel;
