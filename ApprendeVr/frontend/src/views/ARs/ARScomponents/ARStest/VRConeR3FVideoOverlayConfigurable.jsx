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
  const mainVideoScale = config.mainVideo?.scale || [5, 4, 1];
  const [mainVideoVolume, setMainVideoVolume] = useState(typeof config.mainVideo?.volume === 'number' ? config.mainVideo.volume : 1);
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

  // Controlador de volumen (barra vertical)
  const VolumeBar = ({ value, onChange, height = mainVideoScale[1], x = mainVideoScale[0]/2 + 0.1, y = -mainVideoScale[1]/2, z = 0.12 }) => {
    // value: 0.0 - 1.0
    return (
      <group position={[x, y, z]}>
        {/* Botón + para subir volumen */}
        <mesh position={[0, height/2 + 0.25, 0]} onPointerDown={() => onChange(Math.min(1, Math.round((value + 0.05) * 100) / 100))}>
          <boxGeometry args={[0.28, 0.28, 0.08]} />
          <meshStandardMaterial color="#00ff88" opacity={0.8} transparent />
        </mesh>
        <Text position={[0, height/2 + 0.25, 0.06]} fontSize={0.18} color="#003366" anchorX="center" anchorY="middle">+</Text>

        {/* Fondo barra */}
        <mesh
          onPointerDown={e => {
            const localY = e.point.y;
            let newValue = Math.max(0, Math.min(1, (localY + height/2) / height));
            // Redondear a dos decimales para mayor precisión visual
            newValue = Math.round(newValue * 100) / 100;
            console.log('[VolumeBar] onPointerDown', { localY, newValue });
            onChange(newValue);
          }}
          onPointerMove={e => {
            if (e.buttons !== 1) return;
            const localY = e.point.y;
            let newValue = Math.max(0, Math.min(1, (localY + height/2) / height));
            newValue = Math.round(newValue * 100) / 100;
            console.log('[VolumeBar] onPointerMove', { localY, newValue });
            onChange(newValue);
          }}
        >
          <boxGeometry args={[0.2, height, 0.1]} />
          <meshStandardMaterial color="#222" opacity={0.7} transparent />
        </mesh>
        {/* Nivel actual */}
        <mesh position={[0, -height/2 + value*height/2, 0.06]}>
          <boxGeometry args={[0.18, value*height, 0.08]} />
          <meshStandardMaterial color="#003366" opacity={0.9} transparent />
        </mesh>
        {/* Botón - para bajar volumen */}
        <mesh position={[0, -height/2 - 0.25, 0]} onPointerDown={() => onChange(Math.max(0, Math.round((value - 0.05) * 100) / 100))}>
          <boxGeometry args={[0.28, 0.28, 0.08]} />
          <meshStandardMaterial color="#00ff88" opacity={0.8} transparent />
        </mesh>
        <Text position={[0, -height/2 - 0.25, 0.06]} fontSize={0.18} color="#003366" anchorX="center" anchorY="middle">-</Text>
        <Text
          position={[0, height/2 + 0.3, 0]}
          fontSize={0.18}
          color="#00ff88"
          anchorX="center"
          anchorY="middle"
        >
          {`Volumen ${(value*100).toFixed(0)}%`}
        </Text>
      </group>
    );
  };

  return (
    <group>
      {/* Video principal */}
      <group position={mainVideoPosition}>
        <ARSVideoUniversal 
          videoSrc={config.mainVideo?.videoSrc || "/videos/gangstas.mp4"}
          position={[0, 0, 0]}
          scale={mainVideoScale}
          autoPlay={true}
          loop={true}
          muted={false}
          volume={mainVideoVolume}
          showFrame={false}
          quality={config.mainVideo?.quality || "720"}
        />
        {/* Barra de volumen a la derecha */}
        <VolumeBar 
          value={mainVideoVolume}
          onChange={v => {
            setMainVideoVolume(v);
            updateElementPosition('mainVideo.volume', v);
            console.log('[VolumeBar] setMainVideoVolume', v);
          }}
          x={mainVideoScale[0]/2 + 0.12}
          y={0}
          z={0.06}
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
      
      {/* Controles de posición (solo en modo debug) */}
      <PositionControl 
        position={mainVideoPosition} 
        label="Main Video" 
        color="#00ff88"
        onUpdate={(pos) => updateElementPosition('mainVideo', pos)}
      />
      // ...existing code...
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
