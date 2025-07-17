import React, { useState, useCallback, useRef } from 'react';
import configArs from '../../../../config/config_Ars.json';
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
  // Reconocimiento de voz para comandos
  const [listening, setListening] = useState(true);
  const recognitionRef = useRef(null);
  // Referencia al video principal
  const mainVideoRef = useRef(null);

  const overlayId = 'vrConeR3FVideoOverlay';
  const { config, updatePosition } = useOverlayConfig(overlayId, renderKey);
  const updateElementPosition = useCallback((elementKey, newPosition) => {
    updatePosition(elementKey, newPosition);
    if (onPositionChange) {
      onPositionChange(overlayId, elementKey, newPosition);
    }
  }, [overlayId, onPositionChange, updatePosition]);

  // Detectar idioma del navegador, default en
  const browserLang = (navigator.language || 'en').split('-')[0];
  const voiceLang = configArs.voiceCommands[browserLang] ? browserLang : 'en';
  const voiceCommands = configArs.voiceCommands[voiceLang];

  React.useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      console.warn('API de reconocimiento de voz no soportada');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = browserLang + '-' + browserLang.toUpperCase();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript.trim().toLowerCase();
          console.log('[Voice] transcript:', transcript);
          if (voiceCommands.volumeUp.some(cmd => transcript.includes(cmd))) {
            setMainVideoVolume(v => Math.min(1, Math.round((v + 0.1) * 100) / 100));
          } else if (voiceCommands.volumeDown.some(cmd => transcript.includes(cmd))) {
            setMainVideoVolume(v => Math.max(0, Math.round((v - 0.1) * 100) / 100));
          } else if (voiceCommands.play.some(cmd => transcript.includes(cmd))) {
            updateElementPosition('mainVideo.autoPlay', true);
            if (mainVideoRef.current && mainVideoRef.current.playVideo) mainVideoRef.current.playVideo();
          } else if (voiceCommands.pause.some(cmd => transcript.includes(cmd))) {
            updateElementPosition('mainVideo.autoPlay', false);
            if (mainVideoRef.current && mainVideoRef.current.pauseVideo) mainVideoRef.current.pauseVideo();
          } else if (voiceCommands.stop.some(cmd => transcript.includes(cmd))) {
            updateElementPosition('mainVideo.autoPlay', false);
            updateElementPosition('mainVideo.position', [0, 5, 0]);
            if (mainVideoRef.current && mainVideoRef.current.stopVideo) mainVideoRef.current.stopVideo();
          } else if (voiceCommands.restart.some(cmd => transcript.includes(cmd))) {
            updateElementPosition('mainVideo.autoPlay', false);
            if (mainVideoRef.current && mainVideoRef.current.restartVideo) mainVideoRef.current.restartVideo();
            setTimeout(() => {
              updateElementPosition('mainVideo.autoPlay', true);
              if (mainVideoRef.current && mainVideoRef.current.playVideo) mainVideoRef.current.playVideo();
            }, 500);
          }
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('[Voice] error:', event.error);
    };

    if (listening) {
      recognition.start();
    } else {
      recognition.stop();
    }

    return () => {
      recognition.stop();
    };
  }, [listening, updateElementPosition]);
  // const overlayId = 'vrConeR3FVideoOverlay'; // Eliminada declaración duplicada
  const [isDragging, setIsDragging] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const videoLabels = [
    "Video R3F", "React Three Fiber", "WebGL Rendering", "Performance Test"
  ];

  // Obtener posiciones desde la configuración
  const mainVideoPosition = config.mainVideo?.position || [0, 5, 0];
  const mainVideoScale = config.mainVideo?.scale || [5, 4, 1];
  const [mainVideoVolume, setMainVideoVolume] = useState(typeof config.mainVideo?.volume === 'number' ? config.mainVideo.volume : 1);
  // Log inicialización de volumen
  console.log('[INIT] mainVideoVolume:', mainVideoVolume, 'config.mainVideo?.volume:', config.mainVideo?.volume);

  // Sincroniza el volumen local con la configuración global
  React.useEffect(() => {
    if (typeof config.mainVideo?.volume === 'number' && config.mainVideo.volume !== mainVideoVolume) {
      console.log('[useEffect] Sync mainVideoVolume from config:', config.mainVideo.volume, 'local:', mainVideoVolume);
      setMainVideoVolume(config.mainVideo.volume);
    } else {
      console.log('[useEffect] No sync needed:', config.mainVideo?.volume, mainVideoVolume);
    }
  }, [config.mainVideo?.volume, mainVideoVolume]);
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
    // Click y drag en la barra para ajustar el volumen exactamente donde se da click o se arrastra
    const handleBarPointer = (e) => {
      // Usar la lógica de ProgressBar: la barra va de -height/2 (abajo) a +height/2 (arriba)
      const localY = e.point.y;
      let percent = (localY + height/2) / height;
      percent = Math.max(0, Math.min(1, percent));
      onChange(percent);
    };
    return (
      <group position={[x, y, z]}>
        {/* Botón + para subir volumen */}
        <mesh position={[0, height/2 + 0.25, 0]} onPointerDown={() => onChange(Math.min(1, Math.round((value + 0.05) * 100) / 100))}>
          <boxGeometry args={[0.28, 0.28, 0.08]} />
          <meshStandardMaterial color="#00ff88" opacity={0.8} transparent />
        </mesh>
        <Text position={[0, height/2 + 0.25, 0.06]} fontSize={0.18} color="#003366" anchorX="center" anchorY="middle">+</Text>

        {/* Fondo barra (clickeable y arrastrable, área original) */}
        <mesh
          onPointerDown={handleBarPointer}
          onPointerMove={e => {
            if (e.buttons === 1) handleBarPointer(e);
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

  // Barra de progreso inferior
  const [videoProgress, setVideoProgress] = useState(0); // 0.0 - 1.0
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  React.useEffect(() => {
    let video = null;
    if (mainVideoRef.current && mainVideoRef.current.videoRef) {
      video = mainVideoRef.current.videoRef.current;
    }
    if (!video) return;
    const updateProgress = () => {
      setVideoCurrentTime(video.currentTime);
      setVideoDuration(video.duration || 0);
      setVideoProgress(video.duration ? video.currentTime / video.duration : 0);
    };
    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', updateProgress);
    updateProgress(); // Inicializa valores
    return () => {
      video.removeEventListener('timeupdate', updateProgress);
      video.removeEventListener('loadedmetadata', updateProgress);
    };
  }, [mainVideoRef.current && mainVideoRef.current.videoRef, renderKey]);

  const ProgressBar = ({ value, current, duration, width = mainVideoScale[0], y = -mainVideoScale[1]/2 - 0.12, z = 0.07 }) => {
    // value: 0.0 - 1.0
    // current: segundos
    // duration: segundos
    const formatTime = (t) => {
      if (!isFinite(t)) return '0:00';
      const min = Math.floor(t / 60);
      const sec = Math.floor(t % 60);
      return `${min}:${sec.toString().padStart(2, '0')}`;
    };
    // Click en la barra para saltar a tiempo
    const handleBarClick = (e) => {
      if (!duration || !mainVideoRef.current) return;
      // e.point.x está en coordenadas locales del mesh
      const localX = e.point.x;
      // La barra va de -width/2 a +width/2
      let percent = (localX + width/2) / width;
      percent = Math.max(0, Math.min(1, percent));
      const newTime = percent * duration;
      // Saltar en el video
      const video = mainVideoRef.current.videoRef ? mainVideoRef.current.videoRef.current : null;
      if (video) {
        video.currentTime = newTime;
      }
    };
    return (
      <group position={[0, y, z]}>
        {/* Tiempo actual y duración por encima de la barra (blanco) */}
        <Text
          position={[-width/2 + 0.5, 0, 0.18]}
          fontSize={0.16}
          color="#ffffff"
          anchorX="left"
          anchorY="middle"
        >
          {formatTime(current)}
        </Text>
        <Text
          position={[width/2 - 0.5, 0, 0.18]}
          fontSize={0.16}
          color="#ffffff"
          anchorX="right"
          anchorY="middle"
        >
          {formatTime(duration)}
        </Text>
        {/* Fondo barra (gris, clickable) */}
        <mesh onPointerDown={handleBarClick}>
          <boxGeometry args={[width, 0.18, 0.08]} />
          <meshStandardMaterial color="#888888" opacity={0.7} transparent />
        </mesh>
        {/* Progreso actual (negro) */}
        <mesh position={[-width/2 + value*width/2, 0, 0.06]}>
          <boxGeometry args={[value*width, 0.14, 0.08]} />
          <meshStandardMaterial color="#000000" opacity={0.95} transparent />
        </mesh>
      </group>
    );
  };

  return (
    <group>
      {/* Botón para activar/desactivar reconocimiento de voz */}
      <group position={[mainVideoPosition[0] + mainVideoScale[0]/2 - (3.5), mainVideoPosition[1] - (2.5), mainVideoPosition[2] + 0.2]}>
        <mesh onClick={() => setListening(l => !l)}>
          <circleGeometry args={[0.25, 64]} />
          <meshStandardMaterial 
            color={listening ? '#0050FF' : '#111111'} 
            metalness={listening ? 1 : 0.2} 
            roughness={listening ? 0.1 : 0.8} 
            opacity={0.92} 
            transparent 
            emissive={listening ? '#0050FF' : '#000000'}
            emissiveIntensity={listening ? 0.25 : 0}
          />
        </mesh>
        <Text position={[0, 0.0, 0.06]} fontSize={0.12} color="#616364ff" anchorX="center" anchorY="middle">
          {listening ? 'Voz ON' : 'Voz OFF'}
        </Text>
        <Text position={[0, -0.4, 0.06]} fontSize={0.13} color="#888888" anchorX="center" anchorY="middle">
          Comandos: subir/bajar volumen, play, pause, stop, reiniciar
        </Text>
      </group>
      {/* Video principal */}
      <group position={mainVideoPosition}>
        {/* LOG: Volumen actual que se pasa al video */}
        {console.log('[VRConeR3FVideoOverlayConfigurable] Render ARSVideoUniversal', {
          mainVideoVolume,
          configVolume: config.mainVideo?.volume,
          autoPlay: !!config.mainVideo?.autoPlay,
          videoSrc: config.mainVideo?.videoSrc
        })}
        <ARSVideoUniversal 
          ref={mainVideoRef}
          videoSrc={config.mainVideo?.videoSrc || "/videos/gangstas.mp4"}
          position={[0, 0, 0]}
          scale={mainVideoScale}
          autoPlay={!!config.mainVideo?.autoPlay}
          loop={true}
          muted={false}
          volume={mainVideoVolume}
          showFrame={false}
          quality={config.mainVideo?.quality || "720"}
        />
        {console.log('[RENDER] ARSVideoUniversal volume prop:', mainVideoVolume)}
        {/* Barra de volumen a la derecha */}
        <VolumeBar 
          value={mainVideoVolume}
          onChange={v => {
            console.log('[VolumeBar] onChange called with:', v);
            setMainVideoVolume(v);
            updateElementPosition('mainVideo.volume', v);
            console.log('[VolumeBar] setMainVideoVolume', v, 'config.mainVideo?.volume:', config.mainVideo?.volume);
          }}
          x={mainVideoScale[0]/2 + 0.12}
          y={0}
          z={0.06}
        />
        {/* Barra de progreso inferior pegada al video */}
        <ProgressBar 
          value={videoProgress}
          current={videoCurrentTime}
          duration={videoDuration}
          width={mainVideoScale[0]}
          y={-mainVideoScale[1]/2 - 0.12}
          z={0.07}
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
