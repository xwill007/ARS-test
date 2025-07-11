import React, { useRef, useEffect, useState } from 'react';

/**
 * Test de comparación visual para verificar que el espejo es IDÉNTICO
 */
const TestComparacionVisual = ({ onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [estado, setEstado] = useState('Iniciando...');
  const [videoListo, setVideoListo] = useState(false);
  const [espejoActivo, setEspejoActivo] = useState(false);
  const [modoComparacion, setModoComparacion] = useState('lado'); // 'lado', 'superposicion', 'diferencia'
  const [ancho, setAncho] = useState(400);
  const [alto, setAlto] = useState(300);

  // Inicializar video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const iniciarVideo = async () => {
      try {
        setEstado('Solicitando acceso a cámara...');
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        
        video.srcObject = stream;
        setEstado('Video iniciado - Esperando carga...');
        
        video.onloadedmetadata = () => {
          video.play();
          setVideoListo(true);
          setEstado('✅ Video listo');
        };

      } catch (error) {
        console.error('❌ Error accediendo a cámara:', error);
        setEstado('❌ Error: ' + error.message);
      }
    };

    iniciarVideo();

    return () => {
      if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Sistema de espejo con comparación visual
  useEffect(() => {
    if (!videoListo || !espejoActivo) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId;

    const copiarFrame = () => {
      if (video.readyState >= 2) {
        // Obtener dimensiones reales
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        const displayWidth = ancho;
        const displayHeight = alto;
        
        // Configurar canvas
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        
        // Limpiar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (modoComparacion === 'diferencia') {
          // Modo diferencia: mostrar solo las diferencias
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#0f0';
          ctx.font = '20px Arial';
          ctx.fillText('Si hay diferencias', 50, 100);
          ctx.fillText('aparecerán aquí', 50, 130);
          return;
        }
        
        // Replicar exactamente object-fit: cover del video
        const videoAspect = videoWidth / videoHeight;
        const displayAspect = displayWidth / displayHeight;
        
        let sourceX = 0, sourceY = 0, sourceWidth = videoWidth, sourceHeight = videoHeight;
        let destX = 0, destY = 0, destWidth = displayWidth, destHeight = displayHeight;
        
        if (videoAspect > displayAspect) {
          sourceWidth = videoHeight * displayAspect;
          sourceX = (videoWidth - sourceWidth) / 2;
        } else {
          sourceHeight = videoWidth / displayAspect;
          sourceY = (videoHeight - sourceHeight) / 2;
        }
        
        // Dibujar el video replicando object-fit: cover exactamente
        ctx.drawImage(
          video,
          sourceX, sourceY, sourceWidth, sourceHeight,
          destX, destY, destWidth, destHeight
        );
        
        if (modoComparacion === 'superposicion') {
          // Modo superposición: añadir transparencia para ver diferencias
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = 1;
        }
        
        // Indicador según el modo
        ctx.fillStyle = modoComparacion === 'superposicion' ? 'rgba(255, 255, 0, 0.9)' : 'rgba(76, 175, 80, 0.9)';
        const indicatorText = modoComparacion === 'superposicion' ? '🔀 SUPERPUESTO' : '🪞 ESPEJO';
        ctx.fillRect(10, 10, 140, 30);
        ctx.fillStyle = 'black';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(indicatorText, 15, 30);
      }
      
      animationId = requestAnimationFrame(copiarFrame);
    };

    copiarFrame();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [videoListo, espejoActivo, ancho, alto, modoComparacion]);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#1a1a1a',
      color: 'white',
      fontFamily: 'Arial',
      overflow: 'auto',
      padding: '20px'
    }}>
      <button 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '10px 20px',
          background: '#f44336',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          fontSize: '16px',
          cursor: 'pointer',
          zIndex: 1000
        }}
      >
        ← Volver
      </button>

      <h1 style={{textAlign: 'center', marginBottom: '20px'}}>
        🔍 Test de Comparación Visual del Espejo
      </h1>

      {/* Estado y controles principales */}
      <div style={{
        display: 'flex',
        gap: '20px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'rgba(0,0,0,0.8)',
          padding: '15px',
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          <div><strong>Estado:</strong> {estado}</div>
          <div><strong>Video:</strong> {videoListo ? '✅' : '⏳'}</div>
          <div><strong>Espejo:</strong> {espejoActivo ? '✅' : '❌'}</div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '15px',
          borderRadius: '8px'
        }}>
          <div style={{marginBottom: '10px'}}><strong>Modo de Comparación:</strong></div>
          <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
            <button 
              onClick={() => setModoComparacion('lado')}
              style={{
                padding: '8px 12px',
                background: modoComparacion === 'lado' ? '#4CAF50' : '#666',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontSize: '12px'
              }}
            >
              👥 Lado a lado
            </button>
            <button 
              onClick={() => setModoComparacion('superposicion')}
              style={{
                padding: '8px 12px',
                background: modoComparacion === 'superposicion' ? '#FF9800' : '#666',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontSize: '12px'
              }}
            >
              🔀 Superposición
            </button>
          </div>
        </div>
      </div>

      {/* Controles de dimensiones */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <div style={{display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '10px'}}>
          <div>
            <label>Ancho: {ancho}px</label>
            <input
              type="range"
              min="200"
              max="600"
              value={ancho}
              onChange={(e) => setAncho(parseInt(e.target.value))}
              style={{display: 'block', width: '150px'}}
            />
          </div>
          <div>
            <label>Alto: {alto}px</label>
            <input
              type="range"
              min="150"
              max="450"
              value={alto}
              onChange={(e) => setAlto(parseInt(e.target.value))}
              style={{display: 'block', width: '150px'}}
            />
          </div>
        </div>
        
        <button
          onClick={() => setEspejoActivo(!espejoActivo)}
          disabled={!videoListo}
          style={{
            padding: '12px 25px',
            fontSize: '16px',
            background: espejoActivo ? '#f44336' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: videoListo ? 'pointer' : 'not-allowed',
            opacity: videoListo ? 1 : 0.5
          }}
        >
          {espejoActivo ? '🛑 Detener' : '▶️ Activar Espejo'}
        </button>
      </div>

      {/* Paneles de comparación */}
      {modoComparacion === 'lado' ? (
        <div style={{
          display: 'flex',
          gap: '20px',
          alignItems: 'flex-start',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{textAlign: 'center'}}>
            <h3 style={{margin: '0 0 10px 0'}}>📹 Original ({ancho}×{alto})</h3>
            <video
              ref={videoRef}
              width={ancho}
              height={alto}
              style={{
                border: '3px solid #4CAF50',
                borderRadius: '8px',
                background: 'black',
                display: 'block',
                objectFit: 'cover'
              }}
              muted
              playsInline
            />
          </div>

          <div style={{textAlign: 'center'}}>
            <h3 style={{margin: '0 0 10px 0'}}>🪞 Espejo ({ancho}×{alto})</h3>
            <canvas
              ref={canvasRef}
              width={ancho}
              height={alto}
              style={{
                border: '3px solid #2196F3',
                borderRadius: '8px',
                background: 'black',
                display: 'block',
                width: `${ancho}px`,
                height: `${alto}px`
              }}
            />
          </div>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          position: 'relative'
        }}>
          <div style={{position: 'relative', textAlign: 'center'}}>
            <h3 style={{margin: '0 0 10px 0'}}>🔀 Comparación por Superposición</h3>
            <div style={{position: 'relative', display: 'inline-block'}}>
              <video
                ref={videoRef}
                width={ancho}
                height={alto}
                style={{
                  border: '3px solid #4CAF50',
                  borderRadius: '8px',
                  background: 'black',
                  display: 'block',
                  objectFit: 'cover'
                }}
                muted
                playsInline
              />
              <canvas
                ref={canvasRef}
                width={ancho}
                height={alto}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  border: '3px solid #2196F3',
                  borderRadius: '8px',
                  width: `${ancho}px`,
                  height: `${alto}px`,
                  pointerEvents: 'none'
                }}
              />
            </div>
            <p style={{fontSize: '12px', color: '#ccc', marginTop: '10px'}}>
              Si las imágenes son idénticas, no deberías ver diferencias visibles
            </p>
          </div>
        </div>
      )}

      {/* Instrucciones */}
      <div style={{
        marginTop: '30px',
        fontSize: '14px',
        color: '#ccc',
        textAlign: 'center',
        maxWidth: '800px',
        margin: '30px auto 0'
      }}>
        <h4>🎯 Cómo verificar que el espejo es perfecto:</h4>
        <ul style={{textAlign: 'left', maxWidth: '600px', margin: '0 auto'}}>
          <li><strong>Lado a lado:</strong> Ambas imágenes deben verse absolutamente idénticas</li>
          <li><strong>Superposición:</strong> No debes ver diferencias cuando se superponen</li>
          <li><strong>Redimensionar:</strong> En cualquier tamaño, el resultado debe ser idéntico</li>
          <li><strong>Movimiento:</strong> Los movimientos deben ser síncronos y exactos</li>
        </ul>
        <p style={{marginTop: '15px', fontStyle: 'italic'}}>
          ✨ Si pasa todas estas pruebas, el sistema de espejo está funcionando perfectamente.
        </p>
      </div>
    </div>
  );
};

export default TestComparacionVisual;
