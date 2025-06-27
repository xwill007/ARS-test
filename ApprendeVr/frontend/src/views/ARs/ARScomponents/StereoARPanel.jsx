import React, { forwardRef } from 'react';
import VRUserArs from './VRUserArs/VRUserArs';

/**
 * StereoARPanel
 * Panel para una vista (ojo) en modo AR estereoscópico.
 * Props:
 *  - videoRef: ref del video HTML5
 *  - width, height: tamaño en px
 *  - overlay: componente React a superponer (ej: <VRDomo />)
 *  - style: estilos extra
 */
const StereoARPanel = forwardRef(({ videoRef, width, height, overlay, style = {} }, ref) => (
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
      style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }}
    />

    <div style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, zIndex: 2, pointerEvents: 'none' }}>
      
      <a-scene embedded vr-mode-ui="enabled: false" style={{ width: '100%', height: '100%', background: 'transparent' }}>
        
        <a-entity camera look-controls position="0 1.6 0">

         

        </a-entity>

        {overlay}
      
      </a-scene>
    </div>

  </div>
));

export default StereoARPanel;
