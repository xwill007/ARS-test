import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import EjemploVideoEstereoscopico from './views/ARs/examples/EjemploVideoEstereoscopico';
import PruebaEspejoSimple from './views/ARs/examples/PruebaEspejoSimple';
import TestEspejoDirecto from './views/ARs/examples/TestEspejoDirecto';
import ARStereoView from './views/ARs/ARSviews/ARStereoView';

/**
 * Página de pruebas para la optimización estereoscópica
 */
const TestPage = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>🧪 Pruebas de Optimización Estereoscópica</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>📋 Opciones de Prueba:</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link 
            to="/test-simple" 
            style={{ 
              padding: '10px 15px', 
              background: '#FF5722', 
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '5px',
              fontWeight: 'bold'
            }}
          >
            🧪 PRUEBA SIMPLE (EMPIEZA AQUÍ)
          </Link>
          <Link 
            to="/test-directo" 
            style={{ 
              padding: '10px 15px', 
              background: '#4CAF50', 
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '5px' 
            }}
          >
            🔍 Test Directo del Espejo
          </Link>
          <Link 
            to="/test-ejemplo" 
            style={{ 
              padding: '10px 15px', 
              background: '#9C27B0', 
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '5px' 
            }}
          >
            🎬 Ejemplo Side-by-Side
          </Link>
          <Link 
            to="/test-stereo" 
            style={{ 
              padding: '10px 15px', 
              background: '#2196F3', 
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '5px' 
            }}
          >
            🥽 Vista Estereoscópica Real
          </Link>
        </div>
      </div>

      <Routes>
        <Route path="/test-directo" element={<TestEspejoDirecto onClose={() => window.history.back()} />} />
        <Route path="/test-simple" element={<PruebaEspejoSimple />} />
        <Route path="/test-ejemplo" element={
          <div>
            <h3>🎬 Ejemplo Side-by-Side (Para Debugging)</h3>
            <p>Aquí puedes ver ambos paneles lado a lado para verificar la funcionalidad:</p>
            <EjemploVideoEstereoscopico />
          </div>
        } />
        <Route path="/test-stereo" element={
          <div>
            <h3>🥽 Vista Estereoscópica Real</h3>
            <p>Vista real para lentes VR:</p>
            <ARStereoView
              onClose={() => window.history.back()}
              overlay={null} // Puedes agregar tu overlay aquí
              defaultSeparation={24}
              defaultWidth={380}
              defaultHeight={480}
            />
          </div>
        } />
        <Route path="/" element={
          <div>
            <h3>👆 Selecciona una opción arriba</h3>
            <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '5px' }}>
              <h4>📝 Instrucciones:</h4>
              <ol>
                <li><strong>Ejemplo Side-by-Side:</strong> Para ver los dos paneles lado a lado y debuggear</li>
                <li><strong>Vista Estereoscópica:</strong> Para probar la experiencia real con lentes VR</li>
              </ol>
              
              <h4>🔧 Para activar el espejo:</h4>
              <ul>
                <li>En la vista estereoscópica, abre el menú de configuración (botón en la esquina)</li>
                <li>Activa: <code>optimizeStereo: true</code></li>
                <li>Activa: <code>mirrorRightPanel: true</code></li>
                <li>Activa: <code>muteRightPanel: true</code></li>
              </ul>
            </div>
          </div>
        } />
      </Routes>
    </div>
  );
};

export default TestPage;
