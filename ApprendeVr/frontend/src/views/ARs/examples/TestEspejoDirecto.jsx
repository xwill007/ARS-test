import React, { useRef, useEffect, useState } from 'react';

/**
 * Test directo del sistema de espejo sin depender de ARStereoView
 * Para verificar que la lógica básica funciona
 */
const TestEspejoDirecto = ({ onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [estado, setEstado] = useState('Iniciando...');
  const [videoListo, setVideoListo] = useState(false);
  const [espejoActivo, setEspejoActivo] = useState(false);

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
          console.log('📹 Video dimensiones:', video.videoWidth, 'x', video.videoHeight);
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

  // Sistema de espejo con dimensiones exactas
  useEffect(() => {
    if (!videoListo || !espejoActivo) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId;

    const copiarFrame = () => {
      if (video.readyState >= 2) { // HAVE_CURRENT_DATA
        // Obtener dimensiones reales del video y del display
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        const displayWidth = video.offsetWidth || 400;
        const displayHeight = video.offsetHeight || 300;
        
        // Asegurar que el canvas tenga las mismas dimensiones de display
        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
          canvas.width = displayWidth;
          canvas.height = displayHeight;
          canvas.style.width = displayWidth + 'px';
          canvas.style.height = displayHeight + 'px';
        }
        
        // Limpiar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Replicar exactamente object-fit: cover del video
        const videoAspect = videoWidth / videoHeight;
        const displayAspect = displayWidth / displayHeight;
        
        let sourceX = 0, sourceY = 0, sourceWidth = videoWidth, sourceHeight = videoHeight;
        let destX = 0, destY = 0, destWidth = displayWidth, destHeight = displayHeight;
        
        if (videoAspect > displayAspect) {
          // Video es más ancho - cortar los lados del video
          sourceWidth = videoHeight * displayAspect;
          sourceX = (videoWidth - sourceWidth) / 2;
        } else {
          // Video es más alto - cortar arriba y abajo del video
          sourceHeight = videoWidth / displayAspect;
          sourceY = (videoHeight - sourceHeight) / 2;
        }
        
        // Dibujar el video replicando object-fit: cover exactamente
        ctx.drawImage(
          video,
          sourceX, sourceY, sourceWidth, sourceHeight,  // Área del video a copiar
          destX, destY, destWidth, destHeight           // Área del canvas de destino
        );
        
        // Añadir indicador de espejo en posición fija
        ctx.fillStyle = 'rgba(76, 175, 80, 0.9)';
        ctx.fillRect(canvas.width - 120, 10, 110, 30);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('🪞 ESPEJO', canvas.width - 115, 30);
        
        // Debug de dimensiones (opcional - solo cada 100 frames)
        if (Math.random() < 0.01) {
          console.log('📏 Dimensiones exactas:', {
            videoOriginal: `${videoWidth}x${videoHeight}`,
            videoDisplay: `${displayWidth}x${displayHeight}`,
            canvasSize: `${canvas.width}x${canvas.height}`,
            sourceArea: `${Math.round(sourceWidth)}x${Math.round(sourceHeight)}`,
            videoAspect: videoAspect.toFixed(3),
            displayAspect: displayAspect.toFixed(3)
          });
        }
      }
      
      animationId = requestAnimationFrame(copiarFrame);
    };

    copiarFrame();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [videoListo, espejoActivo]);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#1a1a1a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'Arial'
    }}>
      {/* Botón de salida */}
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

      {/* Estado del sistema */}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        background: 'rgba(0,0,0,0.8)',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '14px',
        zIndex: 999
      }}>
        <div style={{marginBottom: '10px', fontWeight: 'bold'}}>
          📊 Test Directo del Espejo
        </div>
        <div>Estado: {estado}</div>
        <div>Video: {videoListo ? '✅' : '⏳'}</div>
        <div>Espejo: {espejoActivo ? '✅ Activo' : '❌ Inactivo'}</div>
      </div>

      {/* Título */}
      <h1 style={{marginBottom: '30px', textAlign: 'center'}}>
        🧪 Test Directo del Sistema de Espejo
      </h1>

      {/* Instrucciones */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '30px',
        maxWidth: '600px',
        textAlign: 'center'
      }}>
        <p>Este test muestra directamente dos paneles:</p>
        <p><strong>Izquierda:</strong> Video de cámara original</p>
        <p><strong>Derecha:</strong> Canvas que copia el video (espejo)</p>
      </div>

      {/* Controles */}
      <div style={{marginBottom: '30px'}}>
        <button
          onClick={() => setEspejoActivo(!espejoActivo)}
          disabled={!videoListo}
          style={{
            padding: '15px 30px',
            fontSize: '18px',
            background: espejoActivo ? '#f44336' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: videoListo ? 'pointer' : 'not-allowed',
            opacity: videoListo ? 1 : 0.5
          }}
        >
          {espejoActivo ? '🛑 Detener Espejo' : '▶️ Activar Espejo'}
        </button>
      </div>

      {/* Paneles lado a lado con dimensiones exactas */}
      <div style={{
        display: 'flex',
        gap: '30px',
        alignItems: 'flex-start',
        justifyContent: 'center'
      }}>
        {/* Panel Izquierdo - Video Original */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <h3 style={{margin: '0 0 10px 0'}}>📹 Original</h3>
          <video
            ref={videoRef}
            width={400}
            height={300}
            style={{
              border: '2px solid #4CAF50',
              borderRadius: '8px',
              background: 'black',
              display: 'block',
              objectFit: 'cover' // Mantener proporciones sin distorsión
            }}
            muted
            playsInline
          />
        </div>

        {/* Panel Derecho - Canvas Espejo */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <h3 style={{margin: '0 0 10px 0'}}>🪞 Espejo</h3>
          <canvas
            ref={canvasRef}
            width={400}
            height={300}
            style={{
              border: '2px solid #2196F3',
              borderRadius: '8px',
              background: 'black',
              display: 'block',
              width: '400px', // Forzar dimensiones exactas
              height: '300px'
            }}
          />
        </div>
      </div>

      {/* Información adicional */}
      <div style={{
        marginTop: '30px',
        fontSize: '12px',
        color: '#ccc',
        textAlign: 'center',
        maxWidth: '600px'
      }}>
        <p>Si ves ambos paneles y el derecho copia exactamente el izquierdo cuando activas el espejo, 
        entonces el sistema básico funciona correctamente.</p>
        <p>Si no funciona aquí, hay un problema fundamental que debe resolverse antes de probarlo en ARStereoView.</p>
      </div>
    </div>
  );
};

export default TestEspejoDirecto;
