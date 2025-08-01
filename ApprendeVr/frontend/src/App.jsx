import React, { useState } from 'react';
import VRConfig from './components/VRConfig/VRConfig';
import VRWorld from './components/VRWorld/VRWorld';
import VRButton from './components/VRViews/VRButton';
import VRFloor from './components/VRWorld/VRFloor';
import VRDomo from './components/VRViews/VRDomo';
import StereoARView from './components/VRViews/VRViewARS/StereoARView';
import VRDisplay from './components/VRDisplay';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky } from '@react-three/drei';
import { VRLanguageProvider, useVRLanguage } from './components/VRConfig/VRLanguageContext';
import { VRThemeProvider } from './components/VRConfig/VRThemeContext';
import { useRef, useState as useStateReact, useEffect } from 'react';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [showVRDisplay, setShowVRDisplay] = useStateReact(true);
  return (
    <ErrorBoundary>
      <VRThemeProvider>
        <VRLanguageProvider>
          <div className="canvas-container">
            {/* UI y R3F */}
            <AppContent showVRDisplay={showVRDisplay} setShowVRDisplay={setShowVRDisplay} />
          </div>
        </VRLanguageProvider>
      </VRThemeProvider>
    </ErrorBoundary>
  );
}

function AppContent({ showVRDisplay, setShowVRDisplay }) {
  const { t, currentLang, setCurrentLang, isLoading } = useVRLanguage();
  const [showDomo, setShowDomo] = useState(false);
  const [showBoth, setShowBoth] = useState(false);
  const [showStereoAR, setShowStereoAR] = useState(false);
  const [showARFrameStereo, setShowARFrameStereo] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const log = (...args) => {
    if (showLogs) {
      if (typeof require === 'function') {
        try {
          require('./src/tools/showLogs.js').default(...args);
        } catch (e) {
          console.log('[ShowLogs fallback]', ...args);
        }
      } else {
        console.log('[ShowLogs fallback]', ...args);
      }
    }
  };
  const [arSeparation, setArSeparation] = useState(24); // px separación
  const [arWidth, setArWidth] = useState(380); // px ancho de cada vista
  const [arHeight, setArHeight] = useState(480); // px alto de cada vista
  const videoRefL = useRef(null);
  const videoRefR = useRef(null);

  const protocol = import.meta.env.VITE_HTTPS === 'true' ? 'https' : 'http'
  const host = import.meta.env.VITE_FRONT_IP
  const port = import.meta.env.VITE_PORT
  const baseUrl = `${protocol}://${host}:${port}`
  const mobileUrl = `${baseUrl}/src/views/mobile/mobile.html`
  const aframeUrl = `${baseUrl}/src/views/A-frame/index.html`  // Corregido para usar la ruta real del archivo

  // Acceso a la cámara para AR
  useEffect(() => {
    if (!showStereoAR) return;
    let stream;
    // Pantalla completa al entrar en modo AR estéreo
    const enterFullscreen = () => {
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
      else if (el.msRequestFullscreen) el.msRequestFullscreen();
    };
    enterFullscreen();
    const getCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (videoRefL.current) videoRefL.current.srcObject = stream;
        if (videoRefR.current) videoRefR.current.srcObject = stream;
      } catch (e) {
        console.error('No se pudo acceder a la cámara', e);
      }
    };
    getCamera();
    return () => {
      // Salir de pantalla completa al salir del modo AR estéreo
      if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showStereoAR]);

  return (
    <div className="canvas-container">

      {showVRDisplay && (
        <VRDisplay
          onShowDomo={() => { setShowDomo((v) => !v); setShowBoth(false); }}
          onShowBothViews={() => { setShowBoth((v) => !v); setShowDomo(false); }}
          onShowARStereo={() => { setShowStereoAR((v) => !v); setShowDomo(false); setShowBoth(false); }}
        />
      )}
      
      {/* Overlay de bienvenida */}
      {(!showDomo && !showBoth && !showStereoAR && !showARFrameStereo) && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          textAlign: 'center',
          color: 'white',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
          pointerEvents: 'none'
        }}>
          <h1 style={{ 
            fontSize: '3rem', 
            marginBottom: '1rem',
            color: '#90caf9',
            fontWeight: 'bold'
          }}>
            {t('appName')}
          </h1>
          <p style={{ 
            fontSize: '1.2rem',
            opacity: 0.9
          }}>
            {t('welcomeMessage')}
          </p>
        </div>
      )}
      <VRConfig 
        showVRDisplay={showVRDisplay} 
        setShowVRDisplay={setShowVRDisplay}
        wordFile="cone_words.json"
        setWordFile={() => {}}
        fontName="Roboto"
        setFontName={() => {}}
        wordFiles={["cone_words.json", "cone_words_gangsta.json", "gangsta.json"]}
        fontOptions={[
          { value: "Roboto", label: "Roboto" },
          { value: "Aclonica", label: "Aclonica" },
          { value: "RockSalt", label: "RockSalt" },
          { value: "Ultra", label: "Ultra" }
        ]}
        onNavigateTo={(destination) => {
          switch(destination) {
            case 'mobile':
              window.open(mobileUrl, '_blank');
              break;
            case 'aframe':
              window.open(aframeUrl, '_blank');
              break;
            case 'ar-stereo':
              window.open(baseUrl + '/src/views/ARs/index.html', '_blank');
              break;
            case 'aframe-voice':
              log('[AR VOZ] Click en botón, estado previo:', showARFrameStereo, showLogs);
              setShowARFrameStereo((prev) => {
                log('[AR VOZ] Cambiando showARFrameStereo a', !prev);
                return !prev;
              });
              setShowLogs((prev) => {
                log('[AR VOZ] Cambiando showLogs a', !prev);
                return !prev;
              });
              break;
            default:
              console.log('Destino no reconocido:', destination);
          }
        }}
      />
      {(!showDomo || showBoth) && (
        <Canvas camera={{ position: [0, 2, 5] }}>
          <Sky 
            sunPosition={[100, 10, 100]}
            turbidity={0.1}
            rayleigh={0.5}
            mieCoefficient={0.003}
            mieDirectionalG={0.7}
          />
          <VRFloor 
            size={[200, 200]} // Piso más grande
            textureRepeat={[100, 100]} // Más repeticiones de textura
            roughness={0.6} // Diferente acabado
            metalness={0.3} // Diferente acabado
          />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
        </Canvas>
      )}
      {(showDomo || showBoth) && (
        <div id="aframe-container"
          style={showBoth ? {
            width: '100vw',
            height: '90vh',
            position: 'absolute',
            left: 0,
            bottom: 0,
            zIndex: 2000,
            background: 'rgba(0,0,0,0.85)',
            borderRadius: '0',
            overflow: 'hidden',
            boxShadow: '0 -4px 16px #0008',
            borderTop: '2px solid #333',
            pointerEvents: 'auto'
          } : {
            width: '100vw',
            height: '100vh',
            position: 'fixed',
            top: 0, left: 0,
            zIndex: 2000,
            background: 'black',
            pointerEvents: 'auto'
          }}
        >
          <button
            style={{
              position: 'absolute',
              top: 16,
              right: 24,
              zIndex: 2100,
              background: '#222',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              padding: '8px 18px',
              fontSize: 16,
              cursor: 'pointer',
              opacity: 0.85
            }}
            onClick={() => { setShowDomo(false); setShowBoth(false); }}
          >
            Volver
          </button>
          <a-scene embedded vr-mode-ui="enabled: true">
            <VRDomo />
          </a-scene>
        </div>
      )}
      {showStereoAR && (
        <StereoARView
          onClose={() => setShowStereoAR(false)}
          defaultSeparation={arSeparation}
          defaultWidth={arWidth}
          defaultHeight={arHeight}
          overlay={<VRDomo />}
        />
      )}

      {showARFrameStereo && (
        <React.Suspense fallback={<div>Cargando ARFrame...</div>}>
          {log('[AR VOZ] Renderizando ARFrameStereoWrapper, showARFrameStereo:', showARFrameStereo)}
          {React.createElement(require('./views/A-frame/views/ARFrameStereoWrapper.jsx').default, {
            onClose: () => {
              log('[AR VOZ] Cierre solicitado desde ARFrameStereoWrapper');
              setShowARFrameStereo(false);
              log('[AR VOZ] Cerrando ARFrameStereoWrapper, showARFrameStereo:', false);
            },
            log: log,
            showLogs: showLogs
          })}
        </React.Suspense>
      )}
    </div>
  );
}

export default App;