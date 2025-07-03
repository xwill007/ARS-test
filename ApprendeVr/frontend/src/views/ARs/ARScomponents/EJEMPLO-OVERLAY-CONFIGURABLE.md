# 🎮 Ejemplo: Crear Overlay Configurable

## 📋 Paso a Paso para Crear un Nuevo Overlay Configurable

### 1. 🎨 Crear el Componente

```jsx
// ARScomponents/ARStest/MiOverlayConfigurable.jsx
import React from 'react';
import { Text } from '@react-three/drei';
import configurableOverlayManager from '../ConfigurableOverlayManager';

const MiOverlayConfigurable = () => {
  const overlayId = 'miOverlay';
  const config = configurableOverlayManager.getOverlayConfig(overlayId);
  
  // Obtener valores con defaults
  const position = config.position || [0, 2, -3];
  const color = config.color || '#ff0000';
  const scale = config.scale || [1, 1, 1];
  const visible = config.visible !== false;
  const texto = config.texto || 'Mi Overlay';
  
  if (!visible) return null;
  
  return (
    <group position={position}>
      <mesh scale={scale}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.3}
        color={color}
        anchorX="center"
        anchorY="middle"
      >
        {texto}
      </Text>
    </group>
  );
};

export default MiOverlayConfigurable;
```

### 2. ⚙️ Registrar el Overlay

```javascript
// overlays/index.js
import MiOverlayConfigurable from '../ARStest/MiOverlayConfigurable';

overlayRegistry.register('miOverlay', {
  component: MiOverlayConfigurable,
  type: 'r3f',
  label: 'Mi Overlay',
  description: 'Overlay personalizado configurable',
  category: 'custom',
  configurable: true,  // ← Importante!
  defaultProps: {}
});
```

### 3. 📝 Agregar Configuración Base

```javascript
// config/config_Ars.js
"overlays": {
  // ...otros overlays...
  "miOverlay": {
    "position": [0, 2, -3],
    "color": "#ff0000",
    "scale": [1, 1, 1],
    "visible": true,
    "texto": "Mi Overlay"
  }
}
```

### 4. 🎛️ Personalizar Panel de Configuración

```jsx
// OverlayConfigPanel.jsx - agregar en el switch de activeTab
{activeTab === 'custom' && overlayId === 'miOverlay' && (
  <div>
    <h4 style={{ color: '#ff88ff', marginTop: 0 }}>Mi Overlay</h4>
    
    <PositionControl 
      label="Posición" 
      configKey="position" 
      defaultValue={[0, 2, -3]}
    />
    
    <ScaleControl 
      label="Escala" 
      configKey="scale" 
      defaultValue={[1, 1, 1]}
    />
    
    <div style={{ marginBottom: '15px' }}>
      <label style={{ 
        display: 'block', 
        marginBottom: '5px', 
        fontWeight: 'bold',
        color: '#ff88ff'
      }}>
        Color
      </label>
      <input
        type="color"
        value={config.color || '#ff0000'}
        onChange={(e) => updateConfig('color', e.target.value)}
        style={{
          width: '100%',
          padding: '5px',
          background: '#333',
          border: '1px solid #555',
          borderRadius: '4px'
        }}
      />
    </div>
    
    <div style={{ marginBottom: '15px' }}>
      <label style={{ 
        display: 'block', 
        marginBottom: '5px', 
        fontWeight: 'bold',
        color: '#ff88ff'
      }}>
        Texto
      </label>
      <input
        type="text"
        value={config.texto || 'Mi Overlay'}
        onChange={(e) => updateConfig('texto', e.target.value)}
        style={{
          width: '100%',
          padding: '5px',
          background: '#333',
          border: '1px solid #555',
          borderRadius: '4px',
          color: 'white'
        }}
      />
    </div>
    
    <div style={{ marginBottom: '15px' }}>
      <label style={{ 
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontWeight: 'bold',
        color: '#ff88ff'
      }}>
        <input
          type="checkbox"
          checked={config.visible !== false}
          onChange={(e) => updateConfig('visible', e.target.checked)}
          style={{ accentColor: '#ff88ff' }}
        />
        Visible
      </label>
    </div>
  </div>
)}
```

## 🎯 Resultado

Después de seguir estos pasos:

1. **Aparece en el menú**: El overlay aparece en la lista con el botón ⚙️
2. **Configurable**: Al hacer clic en ⚙️ se abre el panel de configuración
3. **Personalizable**: Puedes cambiar posición, color, escala, texto y visibilidad
4. **Persistente**: Las configuraciones se guardan automáticamente
5. **Interactivo**: Los cambios se ven en tiempo real

## 🚀 Características Avanzadas

### 🎨 Animaciones Configurables
```javascript
"miOverlay": {
  "position": [0, 2, -3],
  "color": "#ff0000",
  "animation": {
    "enabled": true,
    "speed": 1.0,
    "type": "rotation"
  }
}
```

### 🔄 Estados Reactivos
```jsx
const [isAnimating, setIsAnimating] = useState(config.animation?.enabled || false);

useFrame(() => {
  if (isAnimating && meshRef.current) {
    meshRef.current.rotation.y += 0.01 * (config.animation?.speed || 1);
  }
});
```

### 📱 Responsive
```javascript
"miOverlay": {
  "mobile": {
    "position": [0, 1, -2],
    "scale": [0.8, 0.8, 0.8]
  },
  "desktop": {
    "position": [0, 2, -3],
    "scale": [1, 1, 1]
  }
}
```

## 🎓 Conceptos Importantes

1. **Configuración Jerárquica**: Base → Usuario → Tiempo Real
2. **Persistencia Automática**: localStorage + React state
3. **Validación**: Valores por defecto siempre definidos
4. **Reactividad**: useEffect para cambios de configuración
5. **Modularidad**: Cada overlay es independiente

¡Ya tienes todo lo necesario para crear overlays súper configurables! 🎉
