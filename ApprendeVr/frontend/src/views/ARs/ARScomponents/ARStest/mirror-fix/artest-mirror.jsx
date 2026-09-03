import React from 'react';
import ReactDOM from 'react-dom/client';
import ARTestMirrorButton from './ARTestMirrorButton';

/**
 * Punto de montaje standalone para el botón de prueba del espejo de overlay (Requerimiento 002).
 * Completamente aislado de src/views/ARs/index.html / appArs.jsx / index.jsx — no los importa ni
 * los modifica. Se accede aparte, en:
 * /src/views/ARs/ARScomponents/ARStest/mirror-fix/artest-mirror.html
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#000' }}>
      <ARTestMirrorButton />
    </div>
  </React.StrictMode>
);
