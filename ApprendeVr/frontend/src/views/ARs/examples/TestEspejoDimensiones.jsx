import React, { useRef, useEffect, useState } from 'react';

/**
 * Test avanzado del espejo con controles de dimensiones en tiempo real
 */
const TestEspejoDimensiones = ({ onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [estado, setEstado] = useState('Iniciando...');
  const [videoListo, setVideoListo] = useState(false);
  const [espejoActivo, setEspejoActivo] = useState(false);
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
      if (video.readyState >= 2) {
        // Obtener dimensiones reales del video y del contenedor display
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        const displayWidth = ancho;
        const displayHeight = alto;
        
        // Actualizar dimensiones del canvas para que coincidan con el display
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        
        // Limpiar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Replicar exactamente object-fit: cover
        const videoAspect = videoWidth / videoHeight;
        const displayAspect = displayWidth / displayHeight;
        
        let sourceX = 0, sourceY = 0, sourceWidth = videoWidth, sourceHeight = videoHeight;
        let destX = 0, destY = 0, destWidth = displayWidth, destHeight = displayHeight;
        
        if (videoAspect > displayAspect) {
          // Video es más ancho que el display - cortar los lados
          sourceWidth = videoHeight * displayAspect;
          sourceX = (videoWidth - sourceWidth) / 2;
        } else {
          // Video es más alto que el display - cortar arriba y abajo
          sourceHeight = videoWidth / displayAspect;
          sourceY = (videoHeight - sourceHeight) / 2;
        }
        
        // Dibujar el video replicando object-fit: cover exactamente
        ctx.drawImage(
          video,
          sourceX, sourceY, sourceWidth, sourceHeight,  // Área del video a copiar
          destX, destY, destWidth, destHeight           // Área del canvas de destino
        );
        
        // Indicador de espejo
        ctx.fillStyle = 'rgba(76, 175, 80, 0.9)';
        ctx.fillRect(10, 10, 110, 30);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('🪞 ESPEJO', 15, 30);
        
        // Debug de dimensiones
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, canvas.height - 60, 180, 50);
        ctx.fillStyle = '#FFF';
        ctx.font = '10px Arial';
        ctx.fillText(`Display: ${displayWidth}x${displayHeight}`, 15, canvas.height - 45);
        ctx.fillText(`Video: ${videoWidth}x${videoHeight}`, 15, canvas.height - 30);
        ctx.fillText(`Source: ${Math.round(sourceWidth)}x${Math.round(sourceHeight)}`, 15, canvas.height - 15);
      }
      
      animationId = requestAnimationFrame(copiarFrame);
    };

    copiarFrame();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [videoListo, espejoActivo, ancho, alto]);

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

      {/* Título */}
      <h1 style={{textAlign: 'center', marginBottom: '20px'}}>
        📐 Test de Dimensiones del Espejo
      </h1>

      {/* Estado del sistema */}
      <div style={{
        background: 'rgba(0,0,0,0.8)',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        fontSize: '14px'
      }}>
        <div style={{fontWeight: 'bold', marginBottom: '5px'}}>📊 Estado del Sistema</div>
        <div>Estado: {estado}</div>
        <div>Video: {videoListo ? '✅' : '⏳'}</div>
        <div>Espejo: {espejoActivo ? '✅ Activo' : '❌ Inactivo'}</div>
      </div>

      {/* Controles de dimensiones */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px'
      }}>
        <h3 style={{marginTop: 0}}>🎛️ Controles de Dimensiones</h3>
        
        <div style={{display: 'flex', gap: '20px', marginBottom: '15px', flexWrap: 'wrap'}}>
          <div>
            <label>Ancho: {ancho}px</label>
            <input
              type="range"
              min="200"
              max="800"
              value={ancho}
              onChange={(e) => setAncho(parseInt(e.target.value))}
              style={{display: 'block', width: '200px'}}
            />
          </div>
          
          <div>
            <label>Alto: {alto}px</label>
            <input
              type="range"
              min="150"
              max="600"
              value={alto}
              onChange={(e) => setAlto(parseInt(e.target.value))}
              style={{display: 'block', width: '200px'}}
            />
          </div>
        </div>

        <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
          <button onClick={() => {setAncho(400); setAlto(300);}} style={{padding: '8px 15px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '5px'}}>
            4:3 (400×300)
          </button>
          <button onClick={() => {setAncho(480); setAlto(270);}} style={{padding: '8px 15px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '5px'}}>
            16:9 (480×270)
          </button>
          <button onClick={() => {setAncho(320); setAlto(240);}} style={{padding: '8px 15px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '5px'}}>
            Pequeño (320×240)
          </button>
          <button onClick={() => {setAncho(640); setAlto(480);}} style={{padding: '8px 15px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '5px'}}>
            Grande (640×480)
          </button>
        </div>
      </div>

      {/* Control del espejo */}
      <div style={{textAlign: 'center', marginBottom: '30px'}}>
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

      {/* Paneles */}
      <div style={{
        display: 'flex',
        gap: '30px',
        alignItems: 'flex-start',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        {/* Panel Izquierdo - Video Original */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <h3 style={{margin: '0 0 10px 0'}}>📹 Original ({ancho}×{alto})</h3>
          <video
            ref={videoRef}
            width={ancho}
            height={alto}
            style={{
              border: '2px solid #4CAF50',
              borderRadius: '8px',
              background: 'black',
              display: 'block',
              objectFit: 'cover'
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
          <h3 style={{margin: '0 0 10px 0'}}>🪞 Espejo ({ancho}×{alto})</h3>
          <canvas
            ref={canvasRef}
            width={ancho}
            height={alto}
            style={{
              border: '2px solid #2196F3',
              borderRadius: '8px',
              background: 'black',
              display: 'block',
              width: `${ancho}px`,
              height: `${alto}px`
            }}
          />
        </div>
      </div>

      {/* Información */}
      <div style={{
        marginTop: '30px',
        fontSize: '12px',
        color: '#ccc',
        textAlign: 'center',
        maxWidth: '600px',
        margin: '30px auto 0'
      }}>
        <p>📐 <strong>Prueba las diferentes dimensiones</strong> para verificar que el espejo mantiene exactamente las mismas proporciones que el original en todos los tamaños.</p>
        <p>🎯 Ambos paneles deberían mostrar la imagen idéntica sin distorsión, independientemente del tamaño.</p>
      </div>
    </div>
  );
};

export default TestEspejoDimensiones;
