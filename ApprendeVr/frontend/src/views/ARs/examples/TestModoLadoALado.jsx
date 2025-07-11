import React, { useState } from 'react';
import ARStereoView from '../ARSviews/ARStereoView';
import CuboRotatorio from '../ARScomponents/overlays/CuboRotatorio';

/**
 * TestModoLadoALado - Prueba específica para verificar el modo "lado a lado"
 * Permite verificar que siempre se muestren ambos paneles, sin importar otras configuraciones
 */
const TestModoLadoALado = ({ onClose }) => {
  const [testMode, setTestMode] = useState('basico');
  const [showARStereoView, setShowARStereoView] = useState(false);

  if (showARStereoView) {
    return (
      <ARStereoView
        onClose={() => setShowARStereoView(false)}
        defaultSeparation={24}
        defaultWidth={380}
        defaultHeight={480}
        overlay={testMode === 'conCubo' ? <CuboRotatorio size={100} position={{ x: 30, y: 30 }} /> : null}
      />
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      padding: 20,
      boxSizing: 'border-box',
      zIndex: 10000
    }}>
      {/* Título */}
      <div style={{
        textAlign: 'center',
        marginBottom: 40
      }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 'bold',
          margin: '0 0 10px 0',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
        }}>
          📐 Test Modo "Lado a Lado"
        </h1>
        <p style={{
          fontSize: 16,
          margin: 0,
          opacity: 0.9,
          maxWidth: 600
        }}>
          Prueba para verificar que siempre se muestren ambos paneles, independientemente de las configuraciones de optimización.
        </p>
      </div>

      {/* Selección de modo de prueba */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: 30,
        width: '100%',
        maxWidth: 500
      }}>
        <h3 style={{
          fontSize: 18,
          marginBottom: 15,
          textAlign: 'center'
        }}>
          🎛️ Selecciona el modo de prueba:
        </h3>
        
        <div style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <button
            onClick={() => setTestMode('basico')}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              border: 'none',
              background: testMode === 'basico' ? '#4CAF50' : 'rgba(255,255,255,0.2)',
              color: 'white',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 'bold',
              transition: 'all 0.3s ease'
            }}
          >
            📱 Básico (sin overlay)
          </button>
          
          <button
            onClick={() => setTestMode('conCubo')}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              border: 'none',
              background: testMode === 'conCubo' ? '#4CAF50' : 'rgba(255,255,255,0.2)',
              color: 'white',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 'bold',
              transition: 'all 0.3s ease'
            }}
          >
            🔄 Con cubo rotatorio
          </button>
        </div>
      </div>

      {/* Instrucciones */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: 30,
        width: '100%',
        maxWidth: 700
      }}>
        <h3 style={{
          fontSize: 16,
          marginBottom: 12,
          textAlign: 'center'
        }}>
          📋 Instrucciones de prueba:
        </h3>
        
        <div style={{
          fontSize: 14,
          lineHeight: 1.6,
          textAlign: 'left'
        }}>
          <div style={{ marginBottom: 10 }}>
            <strong>1.</strong> Al entrar en ARStereoView, habilita "<strong>📐 Lado a lado</strong>" en el menú de configuración.
          </div>
          <div style={{ marginBottom: 10 }}>
            <strong>2.</strong> Verifica que siempre se muestren <strong>ambos paneles</strong>, sin importar otras configuraciones.
          </div>
          <div style={{ marginBottom: 10 }}>
            <strong>3.</strong> Prueba diferentes combinaciones:
            <ul style={{ margin: '5px 0', paddingLeft: 20 }}>
              <li>Lado a lado + Modo eficiente ✓</li>
              <li>Lado a lado + Espejo activado ✓</li>
              <li>Lado a lado sin modo eficiente ✓</li>
            </ul>
          </div>
          <div style={{ marginBottom: 10 }}>
            <strong>4.</strong> Si seleccionaste "Con cubo rotatorio", activa también "<strong>🔄 Cubo test</strong>" para ver el overlay.
          </div>
          <div>
            <strong>5.</strong> Confirma que el cubo aparece en <strong>ambos paneles</strong> si está habilitado.
          </div>
        </div>
      </div>

      {/* Resultados esperados */}
      <div style={{
        background: 'rgba(76, 175, 80, 0.2)',
        border: '2px solid #4CAF50',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: 30,
        width: '100%',
        maxWidth: 600
      }}>
        <h4 style={{
          fontSize: 14,
          margin: '0 0 10px 0',
          textAlign: 'center'
        }}>
          ✅ Resultado esperado:
        </h4>
        <p style={{
          fontSize: 13,
          margin: 0,
          textAlign: 'center'
        }}>
          Con "Lado a lado" activado, <strong>siempre</strong> deberías ver dos paneles lado a lado, 
          independientemente de otras configuraciones. Si hay overlays, deben aparecer en ambos paneles.
        </p>
      </div>

      {/* Botones de acción */}
      <div style={{
        display: 'flex',
        gap: 15,
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button
          onClick={() => setShowARStereoView(true)}
          style={{
            padding: '15px 30px',
            borderRadius: '8px',
            border: 'none',
            background: '#4CAF50',
            color: 'white',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.4)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 16px rgba(76, 175, 80, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.4)';
          }}
        >
          🚀 Iniciar Test Modo Lado a Lado
        </button>
        
        <button
          onClick={onClose}
          style={{
            padding: '15px 30px',
            borderRadius: '8px',
            border: '2px solid white',
            background: 'transparent',
            color: 'white',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 'bold',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'white';
            e.target.style.color = '#1e3c72';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent';
            e.target.style.color = 'white';
          }}
        >
          ← Volver al menú
        </button>
      </div>
    </div>
  );
};

export default TestModoLadoALado;
