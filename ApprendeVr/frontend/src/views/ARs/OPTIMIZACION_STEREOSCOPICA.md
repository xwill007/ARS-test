# Optimización Estereoscópica - Solución de Audio Duplicado

## Problema
Al crear vistas estereoscópicas con dos paneles que renderizan el mismo contenido (video y controles de voz), se duplicaba el audio ya que ambos paneles reproducían el sonido simultáneamente.

## Solución Implementada

### 1. Panel Espejo (Mirror Panel)
Se implementó un sistema de panel espejo que captura el contenido visual del panel principal y lo replica sin duplicar el audio ni las interacciones.

### 2. Nuevas Props en VRLocalVideoOverlay

```jsx
const VRLocalVideoOverlay = ({ 
  // Props existentes...
  
  // Nuevas props para optimización estereoscópica
  isMirrorPanel = false,      // Indica si este panel es una réplica
  muteAudio = false,          // Fuerza el silenciado del audio
  disableInteractions = false, // Desactiva interacciones en panel réplica
  ...props 
}) => {
```

### 3. Funcionalidades del Panel Espejo

#### Captura de Video a 60fps
- Usa `canvas.getContext('2d')` para capturar frames del video principal
- Actualiza la textura a 60fps usando `setInterval()`
- Sincroniza automáticamente con el estado del panel principal

#### Audio Optimizado
- El panel espejo NO reproduce audio
- Solo el panel principal maneja la reproducción de sonido
- Eliminación completa de duplicación de audio

#### Controles de Voz Únicos
- El control de voz se desactiva automáticamente en paneles espejo
- Solo el panel principal responde a comandos de voz
- Previene conflictos y duplicación de comandos

## Uso en ARStereoView

### Configuración Automática
El sistema se activa automáticamente cuando:
```javascript
optimizeStereo: true,
mirrorRightPanel: true,
muteRightPanel: true
```

### Cómo Funciona

1. **Panel Izquierdo (Principal):**
   ```jsx
   <VRLocalVideoOverlay 
     videoSrc="/videos/sample.mp4"
     autoplay={true}
     enableVoiceCommands={true}
     // Panel principal - funcionalidad completa
   />
   ```

2. **Panel Derecho (Espejo):**
   ```jsx
   <VRLocalVideoOverlay 
     videoSrc="/videos/sample.mp4"
     isMirrorPanel={true}        // ✅ Modo espejo activado
     muteAudio={true}            // ✅ Audio silenciado
     disableInteractions={true}  // ✅ Interacciones deshabilitadas
   />
   ```

## Beneficios

### ✅ Eliminación de Audio Duplicado
- Solo un panel reproduce audio
- Experiencia auditiva limpia y natural

### ✅ Rendimiento Optimizado
- Panel espejo más liviano (sin controles complejos)
- Sincronización eficiente a 60fps
- Menor uso de recursos de audio

### ✅ Controles Unificados
- Un solo set de controles de voz
- No hay conflictos entre paneles
- Comandos de voz más confiables

### ✅ Sincronización Perfecta
- Contenido visual idéntico en ambos paneles
- Búsqueda y reproducción sincronizada
- Estado compartido entre paneles

## Indicadores Visuales

### Panel Principal
- Controles de reproducción visibles
- Barra de progreso interactiva
- Icono de micrófono funcional

### Panel Espejo
- Indicador visual "🪞" 
- Controles de reproducción ocultos
- Sin controles de voz

## Implementación Técnica

### Captura de Video Simplificada (Sin lag)
```javascript
// En ARStereoView.jsx - Sistema de espejo optimizado
useEffect(() => {
  if (mirrorRightPanel && optimizeStereo) {
    const interval = setInterval(() => {
      const canvas = rightCanvasRef.current;
      const video = videoRefL.current;
      
      if (canvas && video && video.readyState >= 2) {
        const ctx = canvas.getContext('2d');
        
        // Limpiar y copiar solo el video (sin overlays complejos)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Indicador simple
        ctx.fillStyle = 'rgba(76, 175, 80, 0.8)';
        ctx.font = '16px Arial';
        ctx.fillText('🪞 ESPEJO', 10, 30);
      }
    }, 1000 / 15); // 15fps para evitar lag
    
    return () => clearInterval(interval);
  }
}, [mirrorRightPanel, optimizeStereo]);
```

### Gestión de Audio
```javascript
// Panel principal: audio habilitado
if (this.data.autoplay === true || this.data.autoplay === 'true' || this.data.muteAudio) {
  this.video.muted = true;
  console.log('🔇 Video muteado:', this.data.muteAudio ? 'por configuración' : 'por autoplay');
} else {
  this.video.muted = false;
}
```

## Configuración Recomendada

Para vista estereoscópica optimizada:
```javascript
const config = {
  optimizeStereo: true,      // Habilitar optimización
  mirrorRightPanel: true,    // Usar panel espejo
  muteRightPanel: true,      // Silenciar panel derecho
  singleCursor: false        // Cursores en ambos paneles (visual)
};
```

## Limpieza de Recursos

El sistema incluye limpieza automática:
```javascript
remove: function() {
  // Limpiar panel espejo
  if (this.mirrorInterval) {
    clearInterval(this.mirrorInterval);
  }
  
  if (this.mirrorCanvas) {
    this.mirrorCtx = null;
    this.mirrorCanvas = null;
  }
  
  // Limpiar video principal
  if (this.video) {
    this.video.pause();
    this.video.src = '';
    this.video.load();
    this.video = null;
  }
}
```

Esta implementación resuelve completamente el problema de audio duplicado mientras mantiene una experiencia visual perfectamente sincronizada en ambos ojos de la vista estereoscópica.

## Instalación de Dependencias

Para una captura óptima del contenido del panel, se recomienda instalar `html2canvas`:

```bash
npm install html2canvas
```

O incluir el script en el HTML:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
```

### Sin html2canvas
El sistema funciona sin html2canvas usando un fallback que captura solo el video y muestra información de estado.

## Solución de Problemas

### El panel espejo no muestra contenido
1. Verificar que `optimizeStereo` y `mirrorRightPanel` estén en `true`
2. Comprobar que hay referencias válidas a `leftPanelRef` y `rightCanvasRef`
3. Revisar la consola para mensajes de error

### Audio sigue duplicándose
1. Verificar que `muteRightPanel` esté en `true`
2. Comprobar que las props `muteAudio` llegan al componente `VRLocalVideoOverlay`
3. Asegurar que el panel derecho está usando el modo espejo

### Rendimiento bajo
1. Reducir la frecuencia de captura (de 30fps a 15fps)
2. Ajustar el `scale` de html2canvas (usar 0.3 en lugar de 0.5)
3. Verificar que no hay otros procesos intensivos ejecutándose
