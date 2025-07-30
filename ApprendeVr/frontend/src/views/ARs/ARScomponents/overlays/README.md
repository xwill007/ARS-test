# SimpleTextOverlay con Video - Solución para iOS

## 🎯 Problema Resuelto

El `SimpleTextOverlay` ha sido mejorado para incluir reproducción de videos de YouTube que funciona correctamente en iOS, resolviendo el problema del "cuadro negro" que ocurría en dispositivos iOS.

## ✨ Características

### 1. **Detección Automática de Plataforma**
- Detecta automáticamente si es iOS, Android o Desktop
- Usa métodos diferentes según la plataforma para máxima compatibilidad

### 2. **Métodos de Reproducción**
- **iOS**: Usa iframe directo (mismo método que `mobile.html`)
- **Android/Desktop**: Usa `VRYoutubePlayer` (método estándar)

### 3. **Video por Defecto**
- Usa el mismo video que funciona en `mobile.html`: `uVFw1Et8NFM`
- Video optimizado para móviles y iOS

### 4. **Modo Debug**
- Incluye información de debug para diagnosticar problemas
- Muestra plataforma detectada y método usado

## 🚀 Cómo Usar

### Uso Básico
```jsx
// El overlay se registra automáticamente como 'simpleText'
// Se puede usar desde el panel de configuración de overlays
```

### Uso Programático
```jsx
import SimpleTextOverlay from './SimpleTextOverlay';

<SimpleTextOverlay
  position={[0, 3, -2]}
  text="¡Hola Mundo AR!"
  showVideo={true}
  videoId="uVFw1Et8NFM"
  videoPosition={[0, 0, -2]}
  videoWidth={3}
  debugMode={false}
/>
```

### Versión Debug
```jsx
// Usar la versión de debug para diagnosticar problemas
// Se registra como 'simpleTextDebug'
```

## 🔧 Props Disponibles

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `position` | `[x, y, z]` | `[0, 3, -2]` | Posición del texto |
| `text` | `string` | `"¡Hola Mundo AR!"` | Texto a mostrar |
| `showVideo` | `boolean` | `true` | Mostrar video |
| `videoId` | `string` | `"uVFw1Et8NFM"` | ID del video de YouTube |
| `videoPosition` | `[x, y, z]` | `[0, 0, -2]` | Posición del video |
| `videoWidth` | `number` | `3` | Ancho del video |
| `debugMode` | `boolean` | `false` | Mostrar información de debug |

## 📱 Compatibilidad

### ✅ Funciona Correctamente
- **iOS Safari**: ✅ (iframe directo)
- **Android Chrome**: ✅ (VRYoutubePlayer)
- **Desktop Chrome**: ✅ (VRYoutubePlayer)
- **Desktop Firefox**: ✅ (VRYoutubePlayer)

### 🔍 Debug Info
El overlay muestra información de debug cuando `debugMode={true}`:
- Plataforma detectada (iOS/Mobile/Desktop)
- ID del video
- Método usado (iframe/VRYoutubePlayer)

## 🎬 Video de Prueba

El video por defecto (`uVFw1Et8NFM`) es el mismo que se usa en `mobile.html` y funciona correctamente en todas las plataformas.

## 🛠️ Solución Técnica

### Para iOS
```jsx
// Usa iframe directo con Html de @react-three/drei
<Html>
  <iframe
    src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=1&playsinline=1&origin=${window.location.origin}`}
    // ... props adicionales
  />
</Html>
```

### Para Android/Desktop
```jsx
// Usa VRYoutubePlayer que maneja la API de YouTube
<VRYoutubePlayer
  videoId={videoId}
  width={videoWidth}
  // ... props adicionales
/>
```

## 🔍 Diagnóstico

Si el video no se reproduce:

1. **Verificar consola**: Buscar errores de JavaScript
2. **Usar modo debug**: Activar `debugMode={true}`
3. **Verificar red**: Asegurar conexión a internet
4. **Probar video diferente**: Cambiar `videoId`

## 📝 Notas Importantes

- El video se reproduce automáticamente en iOS
- Los controles están habilitados para interacción manual
- El video se adapta al tamaño especificado
- La detección de plataforma es automática

## 🎯 Resultado Esperado

En iOS deberías ver:
1. ✅ Texto "¡Hola Mundo AR!"
2. ✅ Video de YouTube reproduciéndose
3. ✅ Indicador "iOS" en rojo
4. ✅ Sin cuadro negro
5. ✅ Controles de video funcionales
