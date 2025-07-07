import React, { useState, useCallback } from 'react';
import { Text } from '@react-three/drei';
import ARSVideoUniversal from './ARSVideoUniversal';
import useOverlayConfig from '../useOverlayConfig';

/**
 * VRConeR3FVideoOverlayConfigurable - Overlay R3F configurable para video
 * Permite ajustar posiciones y parámetros desde la configuración
 */
const VRConeR3FVideoOverlayConfigurable = ({ 
  onPositionChange,
  showControls = false,
  renderKey = 0 // Clave para forzar re-render
}) => {
  const overlayId = 'vrConeR3FVideoOverlay';
  const { config, updatePosition } = useOverlayConfig(overlayId, renderKey);
  
  const [isDragging, setIsDragging] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const videoLabels = [
    "Video R3F", "React Three Fiber", "WebGL Rendering", "Performance Test"
  ];

  // Función para actualizar posición de elementos
  const updateElementPosition = useCallback((elementKey, newPosition) => {
    updatePosition(elementKey, newPosition);
    if (onPositionChange) {
      onPositionChange(overlayId, elementKey, newPosition);
    }
  }, [overlayId, onPositionChange, updatePosition]);

  // Obtener posiciones desde la configuración
  const mainVideoPosition = config.mainVideo?.position || [0, 5, 0];
  const secondaryVideoPosition = config.secondaryVideo?.position || [6, 5, 0];
  const mainVideoScale = config.mainVideo?.scale || [5, 4, 1];
  const secondaryVideoScale = config.secondaryVideo?.scale || [3, 2, 1];
  const radiusBase = config.labels?.radiusBase || 8;
  const height = config.labels?.height || 10;
  const yOffset = config.labels?.yOffset || -2;
  const centerMarkerPosition = config.centerMarker?.position || [0, 0, 0];

  // Debug logging
  console.log('VRConeR3FVideoOverlayConfigurable render:', {
    overlayId,
    renderKey,
    mainVideoPosition,
    config,
    mainVideoSrc: config.mainVideo?.videoSrc,
    secondaryVideoSrc: config.secondaryVideo?.videoSrc
  });

  // Componente de control de posición (para modo debug)
  const PositionControl = ({ position, onUpdate, label, color = "#00ff88" }) => {
    if (!showControls) return null;

    return (
      <group position={position}>
        <mesh>
          <sphereGeometry args={[0.2]} />
          <meshStandardMaterial 
            color={color} 
            opacity={0.7} 
            transparent 
            wireframe 
          />
        </mesh>
        <Text
          position={[0, 0.5, 0]}
          fontSize={0.2}
          color={color}
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
        <Text
          position={[0, -0.5, 0]}
          fontSize={0.15}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {`${position[0].toFixed(1)}, ${position[1].toFixed(1)}, ${position[2].toFixed(1)}`}
        </Text>
      </group>
    );
  };

  return (
    <group>
      {/* Video principal */}
      <group position={mainVideoPosition}>
        <ARSVideoUniversal 
          videoSrc={config.mainVideo?.videoSrc || "/videos/sample.mp4"}
          position={[0, 0, 0]}
          scale={mainVideoScale}
          autoPlay={true}
          loop={true}
          muted={true}
          showFrame={false}
          quality={config.mainVideo?.quality || "720"}
        />
        
        {/* Fondo semitransparente para mejorar visibilidad - solo si está habilitado */}
        {config.mainVideo?.showBackground && (
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[mainVideoScale[0] + 0.5, mainVideoScale[1] + 0.5]} />
            <meshStandardMaterial 
              color="#000000" 
              opacity={0.15} 
              transparent 
            />
          </mesh>
        )}
        
        {/* Etiqueta del video principal */}
        <Text
          position={[0, mainVideoScale[1]/2 + 0.5, 0]}
          fontSize={0.3}
          color="#00ff88"
          anchorX="center"
          anchorY="middle"
        >
          VIDEO PRINCIPAL
        </Text>
      </group>

      {/* Video secundario */}
      <group position={secondaryVideoPosition}>
        <ARSVideoUniversal 
          videoSrc={config.secondaryVideo?.videoSrc || "/videos/gangstas.mp4"}
          position={[0, 0, 0]}
          scale={secondaryVideoScale}
          autoPlay={true}
          loop={true}
          muted={true}
          showFrame={false}
          quality={config.secondaryVideo?.quality || "720"}
        />
        
        {/* Fondo semitransparente para el video secundario - solo si está habilitado */}
        {config.secondaryVideo?.showBackground && (
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[secondaryVideoScale[0] + 0.3, secondaryVideoScale[1] + 0.3]} />
            <meshStandardMaterial 
              color="#000000" 
              opacity={0.15} 
              transparent 
            />
          </mesh>
        )}
        
        {/* Etiqueta del video secundario */}
        <Text
          position={[0, secondaryVideoScale[1]/2 + 0.3, 0]}
          fontSize={0.2}
          color="#ff8800"
          anchorX="center"
          anchorY="middle"
        >
          VIDEO SECUNDARIO
        </Text>
      </group>

      {/* Etiquetas informativas en círculo */}
      {videoLabels.map((label, i) => {
        const angle = (i * 2 * Math.PI) / videoLabels.length;
        const x = radiusBase * Math.cos(angle);
        const z = radiusBase * Math.sin(angle);
        const y = height + yOffset;

        return (
          <group key={i} position={[x, y, z]} rotation={[0, -angle, 0]}>
            <mesh>
              <boxGeometry args={[3, 0.8, 0.1]} />
              <meshStandardMaterial 
                color="#1a1a1a" 
                opacity={0.9} 
                transparent 
              />
            </mesh>
            <Text
              position={[0, 0, 0.06]}
              fontSize={0.25}
              color="#00ff88"
              anchorX="center"
              anchorY="middle"
              maxWidth={2.8}
            >
              {label}
            </Text>
          </group>
        );
      })}
      
      {/* Marcador central */}
      {config.centerMarker?.visible && (
        <group position={centerMarkerPosition}>
          <mesh>
            <sphereGeometry args={[0.3]} />
            <meshStandardMaterial 
              color={config.centerMarker?.color || "#00ff88"} 
              opacity={0.8} 
              transparent 
            />
          </mesh>
          
          <Text
            position={[0, -1, 0]}
            fontSize={0.3}
            color={config.centerMarker?.color || "#00ff88"}
            anchorX="center"
            anchorY="middle"
          >
            R3F VIDEO TEST
          </Text>
        </group>
      )}

      {/* Controles de posición (solo en modo debug) */}
      <PositionControl 
        position={mainVideoPosition} 
        label="Main Video" 
        color="#00ff88"
        onUpdate={(pos) => updateElementPosition('mainVideo', pos)}
      />
      <PositionControl 
        position={secondaryVideoPosition} 
        label="Secondary Video" 
        color="#ff8800"
        onUpdate={(pos) => updateElementPosition('secondaryVideo', pos)}
      />
      <PositionControl 
        position={centerMarkerPosition} 
        label="Center Marker" 
        color="#ff0088"
        onUpdate={(pos) => updateElementPosition('centerMarker', pos)}
      />

      {/* Información de configuración */}
      <Text
        position={[0, -3, 0]}
        fontSize={0.2}
        color="#888888"
        anchorX="center"
        anchorY="middle"
      >
        Configurable Video Overlay - Ver archivo de configuración
      </Text>
    </group>
  );
};

export default VRConeR3FVideoOverlayConfigurable;
