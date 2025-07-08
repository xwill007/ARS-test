# Optimización Estereoscópica para ARS

## Descripción
Sistema de optimización para el modo estereoscópico que reduce el uso de recursos evitando la duplicación innecesaria de overlays, reconocimiento de voz y audio.

## Funcionalidades Implementadas

### 🔧 Optimización General (`optimizeStereo`)
- **Función**: Activa el modo de optimización estereoscópica
- **Efecto**: Habilita las opciones de espejo y silenciado
- **Beneficio**: Reduce carga de CPU/GPU y evita duplicación de recursos

### 🪞 Espejo del Panel Derecho (`mirrorRightPanel`)
- **Función**: El panel derecho no renderiza overlays independientes
- **Efecto**: Solo muestra el video de cámara con un indicador visual
- **Beneficio**: Elimina duplicación de overlays A-Frame/R3F
- **Ideal para**: Cuando ambos ojos deben ver el mismo contenido

### 🔇 Silenciar Panel Derecho (`muteRightPanel`)
- **Función**: Desactiva el audio en el panel derecho
- **Efecto**: Solo el panel izquierdo reproduce sonido
- **Beneficio**: Evita eco y duplicación de audio
- **Por defecto**: Activado (recomendado)

## Componentes Modificados

### ARSConfig.jsx
- Añadidos controles de UI para las nuevas opciones
- Validación de dependencias (optimización requerida para sub-opciones)
- Persistencia en configuración JSON

### ARStereoView.jsx
- Nuevos estados para optimización
- Lógica de renderizado condicional de paneles
- Indicador visual cuando optimización está activa
- Props diferenciadas para panel principal vs secundario

### ARPanel.jsx
- Detección de panel principal vs secundario
- Silenciado condicional de video
- Renderizado optimizado de overlays
- Integración con OptimizedOverlayWrapper

### VRVoiceController.jsx
- Desactivación automática en paneles secundarios
- Props para control de reconocimiento de voz
- Indicadores visuales cuando está desactivado

### OptimizedOverlayWrapper.jsx (Nuevo)
- Wrapper inteligente para overlays
- Clonado selectivo de componentes con props optimizadas
- Manejo automático de componentes de voz

## Configuración Recomendada

```javascript
// Para máxima optimización
{
  optimizeStereo: true,
  mirrorRightPanel: true,  // Solo si ambos ojos ven lo mismo
  muteRightPanel: true     // Siempre recomendado
}

// Para overlays independientes por ojo
{
  optimizeStereo: true,
  mirrorRightPanel: false, // Cada ojo renderiza su overlay
  muteRightPanel: true     // Audio solo en panel izquierdo
}
```

## Casos de Uso

### Modo Espejo (Recomendado)
- Videos educativos
- Presentaciones
- Contenido informativo
- **Ventaja**: Máximo rendimiento

### Modo Independiente
- Experiencias VR inmersivas
- Juegos con perspectiva estereoscópica
- Simulaciones 3D
- **Ventaja**: Flexibilidad visual

## Indicadores Visuales

- **⚡ Modo Optimizado**: Optimización general activa
- **🪞**: Panel derecho en modo espejo
- **🔇**: Audio silenciado en panel derecho
- **🔇 Reconocimiento desactivado**: En paneles secundarios

## Beneficios de Rendimiento

1. **CPU**: Reduce procesamiento de overlays duplicados
2. **Memoria**: Evita instancias duplicadas de componentes
3. **Audio**: Elimina procesamiento de audio redundante
4. **Reconocimiento de Voz**: Un solo listener activo
5. **WebGL**: Menor uso de contextos gráficos

## Compatibilidad

- ✅ Overlays A-Frame
- ✅ Overlays React Three Fiber
- ✅ Componentes con reconocimiento de voz
- ✅ Videos con audio
- ✅ Configuración persistente

## Uso

1. Abrir configuración ARS (⚙️)
2. Activar "Optimizar" en sección "Optimización Estereoscópica"  
3. Configurar opciones según necesidad
4. Guardar configuración
5. ¡Disfrutar del rendimiento mejorado!
