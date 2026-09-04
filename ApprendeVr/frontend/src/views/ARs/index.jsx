import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import ARSApp from './appArs.jsx';
import { VRLanguageProvider, useVRLanguage } from '../../components/VRConfig/VRLanguageContext';
import './index.css'

function ARSEntry() {
  const { t, currentLang } = useVRLanguage();
  useEffect(() => {
    document.title = t('titles.mobile');
  }, [currentLang]);
  return <ARSApp />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <VRLanguageProvider>
      <ARSEntry />
    </VRLanguageProvider>
  </React.StrictMode>
)
