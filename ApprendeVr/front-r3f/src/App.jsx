import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sky } from '@react-three/drei'
import { useState, useEffect } from 'react'
import VRLanguages from './components/VRLanguages'
import VRWorld from './components/VRWorld/VRWorld'
import VRButton from './components/VRButton'



function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial 
        color="#53a852"
        roughness={1}
        metalness={0}
      />
    </mesh>
  )
}

function App({ aframeLink = 'A-frame/index.html' }) { // Add default parameter
  const [translations, setTranslations] = useState({});
  const [currentLang, setCurrentLang] = useState('en');
  const [isLoading, setIsLoading] = useState(true);

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

  const handleAFrameClick = () => {
    window.location.href = aframeLink;
  };

  const protocol = import.meta.env.VITE_HTTPS === 'true' ? 'https' : 'http'
  const host = import.meta.env.VITE_FRONT_IP
  const port = import.meta.env.VITE_PORT
  const mobileUrl = `${protocol}://${host}:${port}/mobile.html`

  return (
    <div className="canvas-container">
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

      <Canvas camera={{ position: [0, 2, 5] }}>
        <Sky 
          sunPosition={[100, 10, 100]}
          turbidity={0.1}
          rayleigh={0.5}
          mieCoefficient={0.003}
          mieDirectionalG={0.7}
        />
        <Floor />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <VRButton
          position={[-1, 1, 0]}
          scale={1}
          text="VR"
          navigateTo={mobileUrl}
        />
        <VRButton
          position={[2, 1, 0]}
          scale={1}
          text="A-FRAME"
          navigateTo={aframeLink}
        />
        <OrbitControls />
      </Canvas>
    </div>
  );
}

export default App;