import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useState, useEffect } from 'react'
import VRLanguages from './components/VRLanguages'

function Box() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  )
}

function App() {
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
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Box />
        <OrbitControls />
      </Canvas>
    </div>
  );
}

export default App;