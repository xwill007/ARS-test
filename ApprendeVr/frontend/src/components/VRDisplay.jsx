import React, { useState, useEffect } from 'react';
import { useVRLanguage } from './VRConfig/VRLanguageContext';

const STORAGE_KEY = 'caCertInstalled';

const VRDisplay = ({ onShowDomo, onShowBothViews, onShowARStereo }) => {
  const { t, isLoading } = useVRLanguage();
  const [caInstalled, setCaInstalled] = useState(() =>
    localStorage.getItem(STORAGE_KEY) === 'true'
  );
  const [justDownloaded, setJustDownloaded] = useState(false);

  useEffect(() => {
    if (justDownloaded) {
      const timer = setTimeout(() => setJustDownloaded(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [justDownloaded]);

  const handleInstallClick = (e) => {
    if (caInstalled) {
      e.preventDefault();
      return;
    }
    localStorage.setItem(STORAGE_KEY, 'true');
    setCaInstalled(true);
    setJustDownloaded(true);
  };

  return (
    <div style={{
      position: 'absolute',
      top: 20,
      left: 20,
      zIndex: 1200,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      alignItems: 'flex-start',
      minWidth: 180
    }}>
      <h1 style={{
        color: 'white',
        fontSize: 28,
        margin: 0,
        marginBottom: 10,
        textShadow: '0 2px 8px #000a',
        fontWeight: 'bold',
        letterSpacing: 1
      }}>
        {isLoading ? 'Loading...' : t('appName')}
      </h1>
      <button
        style={buttonStyle}
        onClick={onShowDomo}
      >
        Mostrar Domo
      </button>
      <button
        style={buttonStyle}
        onClick={onShowBothViews}
      >
        Ambas Vistas
      </button>
      <button
        style={buttonStyle}
        onClick={onShowARStereo}
      >
        AR Stereo
      </button>
      {!caInstalled && (
        <a
          href="/ca.pem"
          download="ca.pem"
          style={certButtonStyle}
          title="Instalar certificado CA para HTTPS en el celular"
          onClick={handleInstallClick}
        >
          {isLoading ? '...' : t('installCert')}
        </a>
      )}
      {justDownloaded && (
        <span style={toastStyle}>
          ✅ Descargado. Instalalo desde ajustes de tu celular.
        </span>
      )}
    </div>
  );
};

const buttonStyle = {
  background: '#1976d2',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  padding: '10px 18px',
  fontWeight: 'bold',
  fontSize: 15,
  cursor: 'pointer',
  boxShadow: '0 2px 8px #0003',
  transition: 'background 0.2s',
};

const certButtonStyle = {
  ...buttonStyle,
  background: '#2e7d32',
  textDecoration: 'none',
  display: 'inline-block',
  marginTop: 8,
};

const toastStyle = {
  background: '#1b5e20',
  color: 'white',
  padding: '8px 14px',
  borderRadius: 8,
  fontSize: 13,
  lineHeight: 1.4,
  maxWidth: 260,
  boxShadow: '0 2px 8px #0003',
};

export default VRDisplay;
