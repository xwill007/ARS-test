# 🎮 Guía Completa: Sistema de Configuración de Overlays

## 🎯 ¿Qué es el Sistema de Configuración?

El nuevo sistema permite ajustar **posiciones, escalas y parámetros** de overlays en tiempo real desde una interfaz gráfica, guardando automáticamente los cambios en el navegador.

## 🚀 Características Principales

### ✅ Overlays Configurables
- **Video Cono R3F**: Posición de videos, escalas, parámetros visuales
- **Cono de Palabras**: Posición, radio, altura, marcadores
- **Cono R3F Básico**: Posición, color, dimensiones

### 🎨 Interfaz de Configuración
- **Panel flotante**: Se abre al hacer clic en el botón ⚙️
- **Tabs organizados**: Posiciones, Escalas, Configuración General
- **Controles precisos**: Inputs numéricos para X, Y, Z
- **Vista previa**: Cambios en tiempo real
- **Persistencia**: Configuraciones guardadas automáticamente

## 📝 Cómo Usar el Sistema

### 1. 🔍 Identificar Overlays Configurables
- Abrir el menú desplegable "📋 OVERLAYS"
- Buscar el ícono ⚙️ junto a los overlays
- Solo los overlays marcados como configurables tienen este botón

### 2. ⚙️ Abrir Panel de Configuración
- Hacer clic en el botón ⚙️ del overlay deseado
- Se abrirá el panel de configuración flotante
- El overlay debe estar **activo** para ver los cambios

### 3. 🎛️ Configurar Parámetros

#### Tab "Positions" (Posiciones)
- **Video Principal**: Posición del video principal (X, Y, Z)
- **Video Secundario**: Posición del video secundario
- **Marcador Central**: Posición del marcador central

#### Tab "Scales" (Escalas)
- **Escala Video Principal**: Ancho, Alto, Profundidad
- **Escala Video Secundario**: Dimensiones del video secundario

#### Tab "General" (Configuración General)
- **Radio Base**: Radio del círculo de etiquetas
- **Altura**: Altura de las etiquetas informativas

### 4. 💾 Guardar Configuración
- Los cambios se guardan automáticamente
- El botón "Guardar" se activa cuando hay cambios pendientes
- Configuraciones se almacenan en localStorage del navegador

## 🛠️ Configuraciones Disponibles

### 📹 Video Cono R3F
```javascript
{
  "mainVideo": {
    "position": [0, 5, 0],    // X, Y, Z
    "scale": [5, 4, 1],       // Ancho, Alto, Profundidad
    "videoSrc": "/videos/sample.mp4"
  },
  "secondaryVideo": {
    "position": [6, 5, 0],
    "scale": [3, 2, 1],
    "videoSrc": "/videos/gangstas.mp4"
  },
  "labels": {
    "radiusBase": 8,          // Radio del círculo de etiquetas
    "height": 10,             // Altura de las etiquetas
    "yOffset": -2             // Desplazamiento vertical
  },
  "centerMarker": {
    "position": [0, 0, 0],
    "visible": true,
    "color": "#00ff88"
  }
}
```

### 🔺 Cono de Palabras
```javascript
{
  "position": [0, 0, 0],
  "radiusBase": 6,
  "height": 6,
  "showUserMarker": true
}
```

### 🟡 Cono R3F Básico
```javascript
{
  "position": [0, 1, -3],
  "radiusBase": 4,
  "height": 6,
  "color": "#ff8800",
  "visible": true
}
```

## 📊 Gestión de Configuraciones

### 💾 Guardar y Cargar
- **Automático**: Los cambios se guardan automáticamente
- **Exportar**: Descargar configuración como archivo JSON
- **Importar**: Cargar configuración desde archivo
- **Resetear**: Restaurar valores por defecto

### 🔄 Persistencia
- Configuraciones se guardan en `localStorage`
- Persisten entre sesiones del navegador
- Configuraciones por overlay independientes

## 🎯 Casos de Uso Comunes

### 1. 🎥 Posicionar Videos
**Problema**: Los videos aparecen demasiado arriba o con fondo negro

**Solución**:
1. Activar overlay "Video Cono R3F"
2. Clic en ⚙️ para abrir configuración
3. Tab "Positions" → Ajustar "Video Principal"
4. Reducir valor Y para bajar el video
5. Ajustar X y Z para posición horizontal/profundidad

### 2. 📏 Escalar Contenido
**Problema**: Videos muy pequeños o muy grandes

**Solución**:
1. Tab "Scales" → "Escala Video Principal"
2. Ajustar ancho (W) y alto (H)
3. Mantener profundidad (D) en 1 para planos

### 3. 🎨 Personalizar Apariencia
**Problema**: Elementos interfieren entre sí

**Solución**:
1. Tab "General" → Ajustar "Radio Base"
2. Aumentar para separar elementos
3. Modificar altura para evitar superposición

## 📋 Controles del Panel

### 🎮 Controles Numéricos
- **Step**: 0.1 para precisión
- **Rango**: Sin límites (usar con cuidado)
- **Formato**: Valores decimales permitidos

### 🔲 Botones de Acción
- **Resetear**: Restaura valores por defecto
- **Exportar**: Descarga configuración completa
- **Guardar**: Confirma cambios (automático)
- **✕**: Cerrar panel

## 🔧 Para Desarrolladores

### Hacer un Overlay Configurable
```javascript
// En overlays/index.js
overlayRegistry.register('miOverlay', {
  component: MiComponent,
  type: 'r3f',
  label: 'Mi Overlay',
  description: 'Overlay personalizado',
  category: 'custom',
  configurable: true,  // ← Importante
  defaultProps: {}
});
```

### Agregar Configuración Base
```javascript
// En config/config_Ars.js
"overlays": {
  "miOverlay": {
    "position": [0, 0, 0],
    "color": "#ff0000",
    "visible": true
  }
}
```

### Usar Configuración en Componente
```javascript
import configurableOverlayManager from '../ConfigurableOverlayManager';

const MiComponent = () => {
  const config = configurableOverlayManager.getOverlayConfig('miOverlay');
  const position = config.position || [0, 0, 0];
  
  return (
    <mesh position={position}>
      {/* Tu componente */}
    </mesh>
  );
};
```

## 📱 Compatibilidad

### ✅ Navegadores Soportados
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### 💾 Almacenamiento
- localStorage requerido
- ~5MB espacio disponible
- Configuraciones por dominio

## 🐛 Solución de Problemas

### Configuración No Se Guarda
1. Verificar que localStorage esté habilitado
2. Comprobar espacio disponible
3. Revisar consola para errores

### Overlay No Aparece Configurable
1. Verificar que `configurable: true` esté en el registro
2. Comprobar que el overlay esté en config_Ars.js
3. Recargar la página

### Panel No Se Abre
1. Verificar que el overlay esté activo
2. Hacer clic directamente en el botón ⚙️
3. Revisar errores en consola

## 🎉 Próximas Características

- 🎨 **Temas visuales**: Esquemas de color personalizables
- 📐 **Snap to grid**: Posicionamiento con rejilla
- 🎯 **Presets**: Configuraciones predefinidas
- 🔄 **Sincronización**: Compartir configuraciones
- 📱 **Modo móvil**: Controles táctiles optimizados

---

¡El sistema de configuración hace que personalizar overlays sea súper fácil! 🚀
