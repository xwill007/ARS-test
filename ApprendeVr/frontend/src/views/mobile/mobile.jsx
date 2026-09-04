import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import MobileApp from './appMobil'
import { VRLanguageProvider, useVRLanguage } from '../../components/VRConfig/VRLanguageContext';
import './mobile.css'

function MobileEntry() {
  const { t, currentLang } = useVRLanguage();
  useEffect(() => {
    document.title = t('titles.mobile');
  }, [currentLang]);
  return <MobileApp />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <VRLanguageProvider>
      <MobileEntry />
    </VRLanguageProvider>
  </React.StrictMode>
)