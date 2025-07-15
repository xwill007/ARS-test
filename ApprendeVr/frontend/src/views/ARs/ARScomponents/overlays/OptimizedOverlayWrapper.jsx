import React from 'react';

/**
 * OptimizedOverlayWrapper
 * Wrapper que maneja la optimización de overlays en modo estereoscópico
 * Desactiva automáticamente reconocimiento de voz y audio en paneles secundarios
 */
const OptimizedOverlayWrapper = ({ 
  children, 
  isPrimaryPanel = true, 
  optimizationSettings = {} 
}) => {
  const { optimizeStereo = false, mirrorRightPanel = false, muteRightPanel = true } = optimizationSettings;
  
  // Si es panel secundario en modo optimización, decidir qué hacer
  if (!isPrimaryPanel && optimizeStereo) {
    // Si está en modo espejo, no renderizar nada
    if (mirrorRightPanel) {
      console.log('🪞 Panel derecho en modo espejo - no renderizando overlay');
      return null;
    }
    
    // Si no está en modo espejo, clonar los children con props optimizadas
    return React.Children.map(children, child => {
      if (React.isValidElement(child)) {
        // Verificar si el componente tiene props relacionadas con voz/audio
        const hasVoiceProps = child.props.hasOwnProperty('disableVoiceRecognition') || 
                             child.props.hasOwnProperty('isPrimaryPanel') ||
                             child.type?.name?.includes('Voice');
        
        if (hasVoiceProps) {
          console.log('🔇 Desactivando reconocimiento de voz en panel secundario');
          return React.cloneElement(child, {
            ...child.props,
            disableVoiceRecognition: true,
            isPrimaryPanel: false,
            muteAudio: muteRightPanel
          });
        }
      }
      return child;
    });
  }
  
  // Panel principal o modo no optimizado - renderizar normalmente
  return React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      // Asegurar que los componentes de voz sepan que son del panel principal
      const hasVoiceProps = child.props.hasOwnProperty('disableVoiceRecognition') || 
                           child.props.hasOwnProperty('isPrimaryPanel') ||
                           child.type?.name?.includes('Voice');
      
      if (hasVoiceProps) {
        return React.cloneElement(child, {
          ...child.props,
          disableVoiceRecognition: false,
          isPrimaryPanel: true,
          muteAudio: false
        });
      }
    }
    return child;
  });
};

export default OptimizedOverlayWrapper;
