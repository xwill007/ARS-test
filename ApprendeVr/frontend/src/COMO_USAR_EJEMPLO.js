// Agrega esto a tu App.jsx o componente principal

import EjemploVideoEstereoscopico from './views/ARs/examples/EjemploVideoEstereoscopico';
import { useState } from 'react';

function App() {
  const [showTest, setShowTest] = useState(false);

  if (showTest) {
    return (
      <div>
        <button 
          onClick={() => setShowTest(false)}
          style={{ 
            position: 'fixed', 
            top: '10px', 
            left: '10px', 
            zIndex: 1000,
            padding: '10px',
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          ← Volver
        </button>
        <EjemploVideoEstereoscopico />
      </div>
    );
  }

  return (
    <div>
      {/* Tu app normal */}
      
      {/* Botón de prueba */}
      <button 
        onClick={() => setShowTest(true)}
        style={{ 
          position: 'fixed', 
          bottom: '20px', 
          right: '20px', 
          padding: '15px',
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          fontSize: '20px',
          cursor: 'pointer',
          zIndex: 1000
        }}
        title="Probar Optimización Estereoscópica"
      >
        🧪
      </button>
    </div>
  );
}
