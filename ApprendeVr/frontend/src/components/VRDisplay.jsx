import React from 'react';
import { useVRLanguage } from './VRConfig/VRLanguageContext';

const VRDisplay = ({ onShowDomo, onShowBothViews, onShowARStereo }) => {
  const { t, isLoading } = useVRLanguage();
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
        {isLoading ? t('common.loading') : t('appName')}
      </h1>
      <button
        style={buttonStyle}
        onClick={onShowDomo}
      >
        {t('display.showDomo')}
      </button>
      <button
        style={buttonStyle}
        onClick={onShowBothViews}
      >
        {t('display.bothViews')}
      </button>
      <button
        style={buttonStyle}
        onClick={onShowARStereo}
      >
        {t('display.arStereo')}
      </button>
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

export default VRDisplay;
