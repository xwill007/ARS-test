import React, { useState, useRef, useEffect } from 'react';
import ARStereoView from '../ARSviews/ARStereoView';
import VRLocalVideoOverlay from '../ARScomponents/overlays/VRLocalVideoOverlay';
import TestEspejoDirecto from './TestEspejoDirecto';
import TestEspejoDimensiones from './TestEspejoDimensiones';
import TestComparacionVisual from './TestComparacionVisual';
import TestModoLadoALado from './TestModoLadoALado';

/**
 * Prueba super simple para verificar que el espejo funciona
 * Versión mejorada con debug visual y test directo
 */
const PruebaEspejoSimple = () => {
  const [modo, setModo] = useState('menu'); // 'menu', 'testDirecto', 'testDimensiones', 'testComparacion', 'testLadoALado', 'testCompleto'
  const [configuracionActivada, setConfiguracionActivada] = useState(false);
  const debugRef = useRef(null);

  useEffect(() => {
    if (modo === 'testCompleto' && !configuracionActivada) {
      // Auto-activar la configuración después de 2 segundos
      const timer = setTimeout(() => {
        console.log('🔧 Auto-activando configuración de espejo...');
        // Simular activación de configuración óptima
        if (window.arsConfigManager) {
          window.arsConfigManager.saveConfig({
            optimizeStereo: true,
            mirrorRightPanel: true,
            muteRightPanel: true,
            arSeparation: 50,
            arWidth: 400,
            arHeight: 300
          });
        }
        setConfiguracionActivada(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [modo, configuracionActivada]);

  // Test directo
  if (modo === 'testDirecto') {
    return <TestEspejoDirecto onClose={() => setModo('menu')} />;
  }

  // Test de dimensiones
  if (modo === 'testDimensiones') {
    return <TestEspejoDimensiones onClose={() => setModo('menu')} />;
  }

  // Test de comparación visual
  if (modo === 'testComparacion') {
    return <TestComparacionVisual onClose={() => setModo('menu')} />;
  }

  // Test de modo lado a lado
  if (modo === 'testLadoALado') {
    return <TestModoLadoALado onClose={() => setModo('menu')} />;
  }

  // Test completo con ARStereoView
  if (modo === 'testCompleto') {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        background: 'black',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Botón de salida */}
        <button 
          onClick={() => setModo('menu')}
          style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            zIndex: 1000,
            padding: '10px',
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontWeight: 'bold'
          }}
        >
          ← Volver al Menú
        </button>

        {/* Debug visual */}
        <div 
          ref={debugRef}
          style={{
            position: 'fixed',
            top: '10px',
            left: '10px',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            fontSize: '12px',
            zIndex: 999,
            fontFamily: 'monospace',
            maxWidth: '300px'
          }}
        >
          <div>📊 Debug ARStereoView</div>
          <div style={{color: configuracionActivada ? '#4CAF50' : '#FFC107'}}>
            Config: {configuracionActivada ? '✅ Activada' : '⏳ Esperando...'}
          </div>
          <div style={{fontSize: '10px', marginTop: '5px', color: '#ccc'}}>
            Deberías ver: Panel izq (video) + Panel der (canvas espejo)
          </div>
          <div style={{fontSize: '10px', marginTop: '5px', color: '#FFC107'}}>
            Usa el menú de configuración (esquina sup-izq) para activar el espejo
          </div>
        </div>
        
        {/* Vista estereoscópica */}
        <ARStereoView
          onClose={() => setModo('menu')}
          overlay={
            <VRLocalVideoOverlay 
              videoSrc="/videos/sample.mp4"
              width={6}
              height={4}
              autoplay={true}
              showCursor={true}
            />
          }
          defaultSeparation={50}
          defaultWidth={400}
          defaultHeight={300}
        />
      </div>
    );
  }

  // Menú principal
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial', 
      maxWidth: '800px', 
      margin: '0 auto',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <h1 style={{textAlign: 'center', marginBottom: '30px'}}>
        🧪 Prueba del Sistema de Espejo Estereoscópico
      </h1>
      
      <div style={{ 
        background: 'rgba(255,255,255,0.1)', 
        padding: '25px', 
        borderRadius: '12px', 
        marginBottom: '30px',
        backdropFilter: 'blur(10px)'
      }}>
        <h3>🎯 Objetivo:</h3>
        <p>Verificar que el panel derecho sea una copia visual exacta del panel izquierdo, 
        mostrando el mismo video de cámara y overlays, pero sin audio duplicado.</p>
      </div>

      <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
        
        {/* Test Directo */}
        <div style={{
          background: 'rgba(76, 175, 80, 0.2)',
          border: '2px solid #4CAF50',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h3 style={{margin: '0 0 15px 0', color: '#4CAF50'}}>
            🔍 Test Directo (Recomendado primero)
          </h3>
          <p style={{marginBottom: '15px'}}>
            Prueba básica del sistema de espejo sin las complejidades de ARStereoView. 
            Usa directamente la cámara y un canvas para verificar que la lógica funciona.
          </p>
          <ul style={{marginBottom: '20px', paddingLeft: '20px'}}>
            <li>✅ Acceso directo a la cámara</li>
            <li>✅ Dos paneles claramente visibles</li>
            <li>✅ Control manual del espejo</li>
            <li>✅ Debug visual en tiempo real</li>
          </ul>
          <button 
            onClick={() => setModo('testDirecto')}
            style={{
              padding: '15px 30px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
            }}
          >
            🚀 Iniciar Test Directo
          </button>
        </div>

        {/* Test de Dimensiones */}
        <div style={{
          background: 'rgba(255, 152, 0, 0.2)',
          border: '2px solid #FF9800',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h3 style={{margin: '0 0 15px 0', color: '#FF9800'}}>
            📐 Test de Dimensiones
          </h3>
          <p style={{marginBottom: '15px'}}>
            Test avanzado con controles de dimensiones en tiempo real para verificar que el espejo mantiene proporciones exactas en cualquier tamaño.
          </p>
          <ul style={{marginBottom: '20px', paddingLeft: '20px'}}>
            <li>🎛️ Controles deslizantes para ancho y alto</li>
            <li>📏 Presets de dimensiones comunes</li>
            <li>📊 Info de dimensiones en tiempo real</li>
            <li>🎯 Verificación de proporciones exactas</li>
          </ul>
          <button 
            onClick={() => setModo('testDimensiones')}
            style={{
              padding: '15px 30px',
              background: '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
            }}
          >
            📐 Test de Dimensiones
          </button>
        </div>

        {/* Test de Comparación Visual */}
        <div style={{
          background: 'rgba(156, 39, 176, 0.2)',
          border: '2px solid #9C27B0',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h3 style={{margin: '0 0 15px 0', color: '#9C27B0'}}>
            🔍 Test de Comparación Visual (CORREGIDO)
          </h3>
          <p style={{marginBottom: '15px'}}>
            Comparación avanzada lado a lado y por superposición para verificar que el espejo es 100% idéntico al original usando la nueva lógica object-fit: cover.
          </p>
          <ul style={{marginBottom: '20px', paddingLeft: '20px'}}>
            <li>👥 Modo lado a lado mejorado</li>
            <li>🔀 Modo superposición para detectar diferencias</li>
            <li>🎛️ Controles de dimensiones en tiempo real</li>
            <li>✨ Implementa object-fit: cover exacto</li>
          </ul>
          <button 
            onClick={() => setModo('testComparacion')}
            style={{
              padding: '15px 30px',
              background: '#9C27B0',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
            }}
          >
            🔍 Test de Comparación
          </button>
        </div>

        {/* Test Modo Lado a Lado */}
        <div style={{
          background: 'rgba(76, 175, 80, 0.2)',
          border: '2px solid #4CAF50',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h3 style={{margin: '0 0 15px 0', color: '#4CAF50'}}>
            📐 Test Modo "Lado a Lado" (NUEVO)
          </h3>
          <p style={{marginBottom: '15px'}}>
            Prueba específica para verificar que la nueva opción "Lado a lado" funciona correctamente, 
            mostrando siempre ambos paneles sin sobreposiciones.
          </p>
          <ul style={{marginBottom: '20px', paddingLeft: '20px'}}>
            <li>📐 Función "Lado a lado" forzado</li>
            <li>🔄 Cubo rotatorio de prueba opcional</li>
            <li>🎛️ Prueba con diferentes configuraciones</li>
            <li>✅ Verifica que no hay sobreposiciones</li>
          </ul>
          <button 
            onClick={() => setModo('testLadoALado')}
            style={{
              padding: '15px 30px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
            }}
          >
            📐 Test Lado a Lado
          </button>
        </div>

        {/* Test Completo */}
        <div style={{
          background: 'rgba(33, 150, 243, 0.2)',
          border: '2px solid #2196F3',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h3 style={{margin: '0 0 15px 0', color: '#2196F3'}}>
            🏗️ Test Completo con ARStereoView
          </h3>
          <p style={{marginBottom: '15px'}}>
            Prueba el sistema integrado completo usando ARStereoView con overlays.
            Requiere activar manualmente las opciones de espejo en el menú de configuración.
          </p>
          <div style={{
            background: 'rgba(255,193,7,0.2)',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '15px',
            border: '1px solid #FFC107'
          }}>
            <h4 style={{margin: '0 0 10px 0', color: '#FFC107'}}>📋 Pasos a seguir:</h4>
            <ol style={{paddingLeft: '20px', margin: 0}}>
              <li>Haz clic en "Iniciar Test Completo"</li>
              <li>Abre el menú de configuración (botón esquina superior izquierda)</li>
              <li>Activa: <strong>optimizeStereo</strong>, <strong>mirrorRightPanel</strong>, <strong>muteRightPanel</strong></li>
              <li>Verifica que aparezcan dos paneles con el derecho marcado como "🪞 ESPEJO"</li>
            </ol>
          </div>
          <button 
            onClick={() => setModo('testCompleto')}
            style={{
              padding: '15px 30px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
            }}
          >
            🔧 Iniciar Test Completo
          </button>
        </div>

      </div>

      <div style={{ 
        marginTop: '40px', 
        fontSize: '14px', 
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        background: 'rgba(0,0,0,0.2)',
        padding: '20px',
        borderRadius: '8px'
      }}>
        <p><strong>💡 Consejo:</strong> Si el test directo funciona pero el completo no, 
        el problema está en la integración con ARStereoView o ARPanel.</p>
        <p><strong>🎥 Nota:</strong> Asegúrate de permitir el acceso a la cámara cuando el navegador lo solicite.</p>
      </div>
    </div>
  );
};

export default PruebaEspejoSimple;
