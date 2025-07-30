# Problemas de Compatibilidad Móvil con A-Frame Videos

## 🚫 Problemas Identificados en iPhone/iOS

### 1. **Autoplay Restringido**
- **Problema**: iOS bloquea el autoplay de videos sin interacción del usuario
- **Síntoma**: Los videos no se reproducen automáticamente
- **Solución**: Deshabilitar autoplay en móviles y esperar interacción del usuario

### 2. **Atributos de Video Faltantes**
- **Problema**: Faltan atributos específicos para iOS
- **Síntoma**: Videos no se cargan o reproducen correctamente
- **Solución**: Agregar todos los atributos necesarios para iOS

### 3. **Problemas de CORS y Origen**
- **Problema**: Restricciones de seguridad en iOS
- **Síntoma**: Videos no se cargan desde ciertas fuentes
- **Solución**: Configurar correctamente crossOrigin y permisos

### 4. **Falta de Cursor/Interacción**
- **Problema**: No hay cursor visible para interacción en móviles
- **Síntoma**: No se puede hacer clic en los videos
- **Solución**: Agregar cursor y raycaster apropiados

## ✅ Soluciones Implementadas

### 1. **Detección de Dispositivo Móvil**
```javascript
const mobileCheck = /iPhone|iPad|iPod|Android|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
setIsMobile(mobileCheck);
```

### 2. **Atributos Específicos para iOS**
```javascript
// Atributos básicos
video.playsInline = true;
video.setAttribute('playsinline', '');
video.setAttribute('webkit-playsinline', '');

// Atributos específicos para iOS
video.setAttribute('x-webkit-airplay', 'allow');
video.setAttribute('x5-video-player-type', 'h5');
video.setAttribute('x5-video-player-fullscreen', 'false');
video.setAttribute('x5-video-orientation', 'portraint');

// Configuración específica para móviles
if (isMobile) {
  video.setAttribute('preload', 'auto');
  video.setAttribute('autobuffer', '');
  video.setAttribute('webkit-playsinline', 'true');
  video.setAttribute('playsinline', 'true');
}
```

### 3. **Manejo de Autoplay en Móviles**
```javascript
if (autoPlay) {
  if (isMobile) {
    console.log('Mobile device detected - waiting for user interaction');
    // No autoplay en móviles, esperar interacción del usuario
  } else {
    video.play().then(() => {
      setIsPlaying(true);
    }).catch(err => {
      console.error('Error playing video:', err);
    });
  }
}
```

### 4. **Interacción Mejorada**
```javascript
// En la escena A-Frame
<a-scene 
  cursor="rayOrigin: mouse"
  raycaster="objects: .clickable"
>
  <a-plane
    class="clickable"
    onClick={handleClick}
  />
  
  <a-camera>
    <a-cursor
      raycaster="objects: .clickable"
    />
  </a-camera>
</a-scene>
```

### 5. **Manejo de Estados de Video**
```javascript
const handleClick = () => {
  if (videoElement) {
    if (isPlaying) {
      videoElement.pause();
      setIsPlaying(false);
    } else {
      // En móviles, asegurar que el video esté listo
      if (isMobile && videoElement.readyState < 2) {
        videoElement.addEventListener('canplay', () => {
          videoElement.play().then(() => {
            setIsPlaying(true);
          });
        }, { once: true });
      } else {
        videoElement.play().then(() => {
          setIsPlaying(true);
        });
      }
    }
  }
};
```

## 🔧 Configuraciones Adicionales Recomendadas

### 1. **Headers del Servidor**
Asegúrate de que tu servidor incluya estos headers:
```
Access-Control-Allow-Origin: *
Content-Type: video/mp4
Accept-Ranges: bytes
```

### 2. **Formato de Video Recomendado**
- **Códec**: H.264
- **Contenedor**: MP4
- **Resolución**: 720p o menor para mejor rendimiento
- **Bitrate**: Optimizado para streaming

### 3. **Configuración de A-Frame**
```html
<a-scene 
  embedded 
  vr-mode-ui="enabled: false"
  background="color: transparent"
  cursor="rayOrigin: mouse"
  raycaster="objects: .clickable"
>
```

## 🧪 Testing en Dispositivos Móviles

### Checklist de Verificación:
- [ ] Video se carga correctamente
- [ ] Cursor es visible y funcional
- [ ] Click/tap reproduce/pausa el video
- [ ] No hay errores en la consola
- [ ] El video se reproduce después de la interacción del usuario
- [ ] El indicador de play/pause funciona correctamente

### Comandos de Debug:
```javascript
// Verificar si es móvil
console.log('Is Mobile:', /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

// Verificar estado del video
console.log('Video readyState:', video.readyState);
console.log('Video networkState:', video.networkState);
console.log('Video error:', video.error);
```

## 🚨 Problemas Comunes y Soluciones

### 1. **Video No Se Carga**
- Verificar que la ruta del video sea correcta
- Asegurar que el servidor sirva el video con headers correctos
- Verificar que el formato de video sea compatible

### 2. **Video No Se Reproduce**
- Asegurar que el usuario haya interactuado con la página
- Verificar que el video esté completamente cargado
- Comprobar que no haya errores de CORS

### 3. **Cursor No Visible**
- Verificar que el raycaster esté configurado correctamente
- Asegurar que los elementos tengan la clase `clickable`
- Comprobar que la cámara tenga un cursor configurado

## 📱 Compatibilidad por Dispositivo

| Dispositivo | iOS Safari | Chrome iOS | Android Chrome | Android Firefox |
|-------------|------------|------------|----------------|-----------------|
| Autoplay    | ❌         | ❌         | ⚠️             | ⚠️              |
| PlaysInline | ✅         | ✅         | ✅             | ✅              |
| Cursor      | ✅         | ✅         | ✅             | ✅              |
| Touch       | ✅         | ✅         | ✅             | ✅              |

## 🔄 Actualizaciones Futuras

- Implementar detección de capacidades del dispositivo
- Agregar soporte para gestos táctiles avanzados
- Optimizar rendimiento para dispositivos de gama baja
- Implementar fallbacks para navegadores no compatibles 