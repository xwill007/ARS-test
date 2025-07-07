import React, { useState, useEffect, useRef } from 'react';

/**
 * VoiceController - Componente para control de voz
 * Permite controlar overlays usando comandos de voz
 */
const VoiceController = ({ 
  onCommand, 
  isEnabled = false,
  language = 'es-ES',
  commands = ['play', 'stop', 'pausa', 'pausar', 'reproducir', 'detener'],
  ...props 
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Verificar soporte del navegador
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      
      // Configurar reconocimiento de voz
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;
      
      // Configurar eventos
      recognition.onstart = () => {
        console.log('🎤 Control de voz iniciado');
        setIsListening(true);
      };
      
      recognition.onend = () => {
        console.log('🎤 Control de voz detenido');
        setIsListening(false);
        
        // Reiniciar automáticamente si está habilitado
        if (isEnabled) {
          setTimeout(() => {
            try {
              recognition.start();
            } catch (error) {
              console.log('Reiniciando reconocimiento...');
            }
          }, 500);
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Error en reconocimiento de voz:', event.error);
        setIsListening(false);
      };
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        const fullTranscript = (finalTranscript + interimTranscript).toLowerCase().trim();
        setTranscript(fullTranscript);
        
        // Procesar comandos cuando el resultado es final
        if (finalTranscript) {
          processCommand(finalTranscript.toLowerCase().trim());
        }
      };
      
      recognitionRef.current = recognition;
    } else {
      console.warn('El navegador no soporta reconocimiento de voz');
      setIsSupported(false);
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language]);

  useEffect(() => {
    if (!isSupported || !recognitionRef.current) return;
    
    if (isEnabled && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.log('Ya está escuchando o error al iniciar');
      }
    } else if (!isEnabled && isListening) {
      recognitionRef.current.stop();
    }
  }, [isEnabled, isSupported]);

  const processCommand = (transcript) => {
    console.log('🗣️ Procesando comando:', transcript);
    
    // Mapear comandos en español e inglés
    const commandMap = {
      'play': 'play',
      'reproducir': 'play',
      'reproduce': 'play',
      'empezar': 'play',
      'iniciar': 'play',
      'start': 'play',
      
      'stop': 'stop',
      'detener': 'stop',
      'parar': 'stop',
      'para': 'stop',
      
      'pause': 'pause',
      'pausa': 'pause',
      'pausar': 'pause',
      'parar': 'pause'
    };
    
    // Buscar comando en el transcript
    for (const [key, value] of Object.entries(commandMap)) {
      if (transcript.includes(key)) {
        console.log(`✅ Comando reconocido: "${key}" -> ${value}`);
        setLastCommand(`${key} -> ${value}`);
        
        // Llamar callback con el comando normalizado
        if (onCommand) {
          onCommand(value, transcript);
        }
        break;
      }
    }
  };

  const toggleListening = () => {
    if (!isSupported) return;
    
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (error) {
        console.log('Error al iniciar reconocimiento');
      }
    }
  };

  if (!isSupported) {
    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: 'rgba(255, 0, 0, 0.8)',
        color: 'white',
        padding: '6px 8px',
        borderRadius: '6px',
        fontSize: '9px',
        zIndex: 1000
      }}>
        ❌ Sin micrófono
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: isListening ? 'rgba(0, 162, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '6px 8px',
      borderRadius: '6px',
      fontSize: '10px',
      zIndex: 1000,
      minWidth: '120px',
      border: isListening ? '1px solid #00ff00' : '1px solid #666'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <button
          onClick={toggleListening}
          style={{
            background: isListening ? '#ff4444' : '#00aa00',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            padding: '3px 6px',
            cursor: 'pointer',
            fontSize: '9px'
          }}
        >
          {isListening ? '🔇' : '🎤'}
        </button>
        <span style={{ fontSize: '9px', opacity: 0.8 }}>
          {isListening ? 'Escuchando...' : 'Control Voz'}
        </span>
      </div>
      
      {lastCommand && (
        <div style={{ fontSize: '8px', color: '#00ff88' }}>
          ✅ {lastCommand.split(' -> ')[0]}
        </div>
      )}
    </div>
  );
};

export default VoiceController;
