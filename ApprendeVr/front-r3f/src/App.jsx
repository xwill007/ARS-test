import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sky } from '@react-three/drei'
import { useState, useEffect, useRef } from 'react'
import VRLanguages from './components/VRConfig/VRLanguages'
import VRWorld from './components/VRWorld/VRWorld'
import VRButton from './components/VRViews/VRButton'
import VRFloor from './components/VRWorld/VRFloor'
import VRDomo from './components/VRViews/VRDomo'
import StereoARView from './components/VRViews/VRViewARS/StereoARView'



function App() {
  const [translations, setTranslations] = useState({});
  const [currentLang, setCurrentLang] = useState('en');
  const [isLoading, setIsLoading] = useState(true);
  const [showDomo, setShowDomo] = useState(false);
  const [showBoth, setShowBoth] = useState(false);
  const [showStereoAR, setShowStereoAR] = useState(false);
  const [arSeparation, setArSeparation] = useState(24); // px separación
  const [arWidth, setArWidth] = useState(380); // px ancho de cada vista
  const [arHeight, setArHeight] = useState(480); // px alto de cada vista
  const videoRefL = useRef(null);
  const videoRefR = useRef(null);

  useEffect(() => {
    const loadTranslations = async (lang) => {
      setIsLoading(true);
      try {
        // Using Vite's import.meta.glob for dynamic imports
        const files = import.meta.glob('./locales/*.json', { eager: true });
        const filePath = `./locales/${lang}.json`;
        
        if (files[filePath]) {
          const translation = files[filePath].default.translation;
          setTranslations(prev => ({
            ...prev,
            [lang]: translation
          }));
        } else {
          console.error(`Translation file not found for language: ${lang}`);
        }
      } catch (error) {
        console.error(`Error loading translations for ${lang}:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTranslations(currentLang);
  }, [currentLang]);

  const handleLanguageChange = (lang) => {
    console.log('Changing language to:', lang);
    setCurrentLang(lang);
  };

  const protocol = import.meta.env.VITE_HTTPS === 'true' ? 'https' : 'http'
  const host = import.meta.env.VITE_FRONT_IP
  const port = import.meta.env.VITE_PORT
  const baseUrl = `${protocol}://${host}:${port}`
  const mobileUrl = `${baseUrl}/mobile.html`
  const aframeUrl = `${baseUrl}/A-frame/index.html`  // Corregido para usar la ruta real del archivo

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
      {/* UI y R3F */}
      <h1 style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'white',
        zIndex: 1000
      }}>
        {isLoading ? 'Loading...' : translations[currentLang]?.appName}
      </h1>

      <VRLanguages onLanguageChange={handleLanguageChange} />
      <button
        style={{ position: 'absolute', top: 70, right: 20, zIndex: 1001 }}
        onClick={() => { setShowDomo((v) => !v); setShowBoth(false); }}
      >
        {showDomo ? 'Cerrar Domo VR' : 'Mostrar Domo VR'}
      </button>
      <button
        style={{ position: 'absolute', top: 110, right: 20, zIndex: 1001 }}
        onClick={() => { setShowBoth((v) => !v); setShowDomo(false); }}
      >
        {showBoth ? 'Cerrar Ambas Vistas' : 'Mostrar Ambas Vistas'}
      </button>
      <button
        style={{ position: 'absolute', top: 150, right: 20, zIndex: 1001 }}
        onClick={() => { setShowStereoAR((v) => !v); setShowDomo(false); setShowBoth(false); }}
      >
        {showStereoAR ? 'Cerrar Modo AR Estéreo' : 'Modo AR Estéreo'}
      </button>
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
          <VRButton
            position={[-1, 1, 0]}
            scale={0.9}
            text="VR-R3F"
            navigateTo={mobileUrl}
          />
          <VRButton
            position={[1, 1, 0]}
            scale={0.9}
            text="A-FRAME"
            navigateTo={aframeUrl}
          />
          <OrbitControls />
        </Canvas>
      )}
      {(showDomo || showBoth) && (
        <div id="aframe-container"
          style={showBoth ? {
            width: '100vw',
            height: '45vh',
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
    </div>
  );
}

export default App;