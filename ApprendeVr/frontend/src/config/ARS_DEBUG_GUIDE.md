# 🔧 Guía de Debugging - Configuración de Resolución de Cámara ARS

## 📋 Pasos para Probar la Funcionalidad

### 1. **Preparación**
```javascript
// En la consola del navegador, cargar herramientas de debug:
// (Copiar y pegar el contenido de src/tools/debugARS.js)

// Limpiar configuración anterior
clearARSConfig();
```

### 2. **Proceso de Prueba**

1. **Abrir la vista ARS:**
   - Hacer clic en el botón de vista ARStereoscópica
   - Observar los logs en la consola

2. **Verificar configuración inicial:**
   ```javascript
   debugARSConfig(); // En la consola del navegador
   ```

3. **Cambiar resolución:**
   - Abrir el menú de configuración (botón ☰)
   - Cambiar la resolución de 720p a 1080p
   - Observar logs: `🔧 Cambiando resolución de cámara a: 1080p`

4. **Guardar configuración:**
   - Hacer clic en "💾 Guardar Configuración"
   - Verificar logs: `💾 Guardando configuración:`
   - Usar botón "🔍 Debug Config" para verificar estado

5. **Verificar persistencia:**
   ```javascript
   debugARSConfig(); // Debe mostrar cameraResolution: "1080p"
   ```

6. **Salir y volver a entrar:**
   - Hacer clic en la flecha ← para salir
   - Volver a abrir la vista ARS
   - Verificar que la resolución se mantiene en 1080p

### 3. **Logs Esperados**

#### Al cargar la vista:
```
🔧 Configuración inicial cargada: {cameraResolution: "1080p", ...}
🎬 Iniciando ARStereoView con resolución: 1080p
🔍 Estado actual de la configuración:
📹 Camera Resolution: 1080p
💾 Configuración persistente en localStorage: {...}
```

#### Al cambiar resolución:
```
🔧 Cambiando resolución de cámara a: 1080p
🎥 Iniciando cámara con resolución 1080p: {width: 1920, height: 1080}
✅ Cámara inicializada con resolución 1080p
```

#### Al guardar:
```
💾 Guardando configuración: {cameraResolution: "1080p", ...}
✅ Configuración AR guardada en localStorage persistente: {...}
✅ Configuración guardada en config_Ars.json
```

### 4. **Troubleshooting**

#### Problema: La resolución vuelve a 720p
- Verificar que `initial.cameraResolution` no sea undefined
- Comprobar que la configuración se está guardando correctamente
- Usar `debugARSConfig()` para verificar localStorage

#### Problema: La cámara no cambia de resolución
- Verificar que el dispositivo soporte la resolución solicitada
- Observar si hay fallback automático a 480p
- Comprobar permisos de cámara

### 5. **Comandos de Debug**

```javascript
// Verificar estado actual
debugARSConfig();

// Limpiar toda la configuración
clearARSConfig();

// Establecer configuración de prueba
testARSConfig();

// Verificar localStorage directamente
localStorage.getItem('arsconfig-persistent');
```

## 🎯 Flujo de Configuración

1. **Carga:** `ARSConfigManager.loadConfig()` → `getInitialConfig()` → Estados React
2. **Cambio:** Usuario modifica resolución → `handleCameraResolutionChange()` → `initializeCamera()`
3. **Guardado:** `saveConfig()` → `ARSConfigManager.saveConfig()` → localStorage
4. **Recarga:** Nueva instancia → `loadConfig()` carga desde localStorage

## 🔍 Puntos de Verificación

- ✅ Configuración inicial incluye `cameraResolution`
- ✅ Estado React se inicializa con valor correcto
- ✅ Cambios se reflejan inmediatamente en UI
- ✅ Configuración se guarda en localStorage
- ✅ Recarga mantiene la configuración
