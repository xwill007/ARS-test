import React, { useEffect, useState } from 'react';
import VRDado from './components/VRWorld/VRDado';
import VRWorld from './components/VRWorld/VRWorld';
import VRUser from './components/VRUser/VRUser';
import './App.css';
import './config/theme.css';
import { Canvas } from '@react-three/fiber';
import Girl from './components/VRGirl/VRGirl';
import Men from './components/VRUser/VRAvatar';
import { Physics } from '@react-three/rapier';
import { showLogs } from './config/config';

const App = () => {
  const boxSize1 = [0.5, 0.5, 0.5];
  const boxPosition1 = [1, 2, -1];
  const [availableLanguages, setAvailableLanguages] = useState(['en', 'es']);
  const [language, setLanguage] = useState('en');
  const [translations, setTranslations] = useState({}); // Initialize as an empty object

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const languageFiles = import.meta.glob('./locales/*.json');
        const languages = [];

        for (const path in languageFiles) {
          const languageCode = path.replace('./locales/', '').replace('.json', '');
          languages.push(languageCode);
        }

        setAvailableLanguages(languages);
        if (showLogs) console.log("languages", languages);
      } catch (error) {
        console.error("Error fetching languages:", error);
      }
    };

    fetchLanguages();
    loadLanguage('en'); // Load default language on mount
  }, []);

  const loadLanguage = async (lng) => {
    try {
      const module = await import(`./locales/${lng}.json`);
      setTranslations(module.default);
      setLanguage(lng);
      console.log(`Loaded ${lng} translations:`, module.default);
    } catch (error) {
      console.error(`Error loading ${lng} translations:`, error);
    }
  };

  const changeLanguage = (lng) => {
    console.log(`changeLanguage called with ${lng}`);
    loadLanguage(lng);
  };

  useEffect(() => {
    console.log("Current language:", language);
    console.log("Translations:", translations);
  }, [language, translations]);

  return (
    <div style={{ height: '100vh' }}>
      <h1>{translations.appName || 'NO Name'}</h1>
      <div>
        <ul>
          {availableLanguages.map((lang) => (
            <li key={lang}>
              <button onClick={() => changeLanguage(lang)}>{lang}</button>
            </li>
          ))}
        </ul>
      </div>
      <Canvas>
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        <Physics>
          <VRDado size={boxSize1} position={boxPosition1} />
          <VRWorld diameter={90} position={[0, 0, 0]} />
          <VRUser initialPosition={[0, 0, -1]} initialRotation={[0, Math.PI / 1, 0]} />
          <Girl position={[2, 0, 5]} scale={1.0} />
        </Physics>
      </Canvas>
    </div>
  );
};

export default App;
