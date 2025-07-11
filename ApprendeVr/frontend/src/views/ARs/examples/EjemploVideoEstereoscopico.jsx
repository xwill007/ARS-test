import React from 'react';
import VRLocalVideoOverlay from '../ARScomponents/overlays/VRLocalVideoOverlay';

/**
 * Ejemplo de uso del sistema de optimización estereoscópica
 * Este componente demuestra cómo usar los paneles espejo para eliminar audio duplicado
 */
const EjemploVideoEstereoscopico = () => {
  return (
    <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
      
      {/* Panel Izquierdo - Principal */}
      <div style={{ 
        width: '400px', 
        height: '300px', 
        border: '2px solid #4CAF50',
        borderRadius: '8px',
        position: 'relative'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#4CAF50' }}>
          👁️ Panel Izquierdo (Principal)
        </h3>
        <VRLocalVideoOverlay 
          videoSrc="/videos/sample.mp4"
          width={8}
          height={4.5}
          autoplay={false}
          enableVoiceCommands={true}
          voiceCommandsActivated={false}
          showCursor={true}
          // Panel principal - funcionalidad completa
          isMirrorPanel={false}
          muteAudio={false}
          disableInteractions={false}
        />
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(76, 175, 80, 0.9)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          🎵 Audio Activo | 🎤 Controles de Voz | 🎮 Interactivo
        </div>
      </div>

      {/* Panel Derecho - Espejo */}
      <div style={{ 
        width: '400px', 
        height: '300px', 
        border: '2px solid #FF9800',
        borderRadius: '8px',
        position: 'relative'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#FF9800' }}>
          👁️ Panel Derecho (Espejo)
        </h3>
        <VRLocalVideoOverlay 
          videoSrc="/videos/sample.mp4"
          width={8}
          height={4.5}
          autoplay={false}
          enableVoiceCommands={false}
          voiceCommandsActivated={false}
          showCursor={true}
          // Panel espejo - optimizado
          isMirrorPanel={true}        // ✅ Modo espejo
          muteAudio={true}            // ✅ Audio silenciado
          disableInteractions={true}  // ✅ Sin interacciones
        />
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(255, 152, 0, 0.9)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          🪞 Espejo Visual | 🔇 Audio Silenciado | 📺 Solo Vista
        </div>
      </div>

      {/* Panel de Control */}
      <div style={{ 
        width: '300px', 
        padding: '20px',
        background: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <h3 style={{ margin: '0 0 15px 0' }}>🎛️ Control Central</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>Beneficios:</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
            <li>✅ Sin audio duplicado</li>
            <li>✅ Sincronización perfecta</li>
            <li>✅ Controles unificados</li>
            <li>✅ Rendimiento optimizado</li>
          </ul>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>Cómo funciona:</h4>
          <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
            <li>Panel izq. controla el video</li>
            <li>Panel der. copia a 60fps</li>
            <li>Audio solo del principal</li>
            <li>Controles solo del principal</li>
          </ol>
        </div>

        <div style={{ 
          background: '#e8f5e8',
          padding: '10px',
          borderRadius: '4px',
          border: '1px solid #4CAF50'
        }}>
          <strong style={{ color: '#2E7D32' }}>Resultado:</strong>
          <br />
          <span style={{ fontSize: '14px' }}>
            Experiencia estereoscópica perfecta sin problemas de audio duplicado
          </span>
        </div>
      </div>
    </div>
  );
};

export default EjemploVideoEstereoscopico;
