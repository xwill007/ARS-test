# 🧪 Sistema de Pruebas del Espejo Estereoscópico - GUÍA COMPLETA

## 📊 Estado Actual
Se han implementado múltiples niveles de prueba para diagnosticar y verificar el sistema de espejo estereoscópico.

## 🚀 Opciones de Acceso

### 1. **Acceso Rápido desde la App Principal**
- Abre la aplicación principal
- Haz clic en el botón flotante **"🧪 Probar Espejo"** (esquina inferior derecha)
- Esto te llevará directamente al menú de pruebas

### 2. **Acceso desde TestPage**
- Navega a `/test` en tu aplicación
- Verás todas las opciones de prueba disponibles

## 🔍 Tipos de Prueba Disponibles

### A. **🧪 Prueba Simple (RECOMENDADA PRIMERO)**
- **Qué hace:** Menú principal con dos opciones de test
- **Acceso:** Botón "🧪 PRUEBA SIMPLE" (rojo)
- **Sub-opciones:**
  - **Test Directo:** Prueba básica del espejo sin ARStereoView
  - **Test Completo:** Prueba integrada con ARStereoView

### B. **🔍 Test Directo del Espejo**
- **Qué hace:** Prueba la lógica básica del espejo usando directamente la cámara
- **Características:**
  - ✅ Acceso directo a la cámara
  - ✅ Dos paneles claramente visibles lado a lado
  - ✅ Control manual para activar/desactivar el espejo
  - ✅ Debug visual en tiempo real
- **Resultado esperado:** Panel izquierdo con video de cámara, panel derecho con canvas que copia exactamente el video

### C. **🏗️ Test Completo con ARStereoView**
- **Qué hace:** Prueba el sistema integrado completo
- **Pasos:**
  1. Inicia el test
  2. Abre el menú de configuración (botón esquina superior izquierda)
  3. Activa estas opciones:
     - ✅ `optimizeStereo: true`
     - ✅ `mirrorRightPanel: true`
     - ✅ `muteRightPanel: true`
  4. Verifica que aparezcan dos paneles con el derecho marcado como "🪞 ESPEJO"

### D. **🎬 Ejemplo Side-by-Side**
- Vista de ejemplo para desarrolladores con debug visual

### E. **🥽 Vista Estereoscópica**
- Vista real para lentes VR (requiere configuración manual)

## 🎯 Diagnóstico del Problema Actual

Según la imagen que proporcionaste, **solo aparece un panel** en lugar de dos. Esto sugiere:

1. **Problema más probable:** El CSS o la lógica de renderizado no está mostrando ambos paneles
2. **Problema secundario:** La configuración del espejo no se está aplicando correctamente

## 📋 Plan de Diagnóstico Paso a Paso

### Paso 1: Verifica el Test Directo
1. Abre la app → Botón "🧪 Probar Espejo" → "🚀 Iniciar Test Directo"
2. Permite acceso a la cámara
3. Observa si aparecen **DOS paneles lado a lado**
4. Activa el espejo y verifica si el panel derecho copia el izquierdo

**Si el Test Directo NO funciona:**
- El problema está en la lógica básica del espejo o acceso a cámara
- Revisa la consola del navegador para errores

**Si el Test Directo SÍ funciona:**
- El problema está en la integración con ARStereoView
- Continúa al Paso 2

### Paso 2: Verifica el Test Completo
1. Desde el menú de pruebas → "🔧 Iniciar Test Completo"
2. Abre el menú de configuración (esquina superior izquierda)
3. Activa las opciones mencionadas
4. Verifica si aparecen dos paneles

### Paso 3: Debug Avanzado
- Abre las herramientas de desarrollador (F12)
- Ve a la pestaña Console
- Busca mensajes de error o warnings
- Los logs incluyen emojis para fácil identificación:
  - 📊 Debug del sistema
  - 🪞 Información del espejo
  - ❌ Errores
  - ✅ Éxitos

## 🛠️ Archivos Modificados/Creados

### Nuevos Archivos:
- `TestEspejoDirecto.jsx` - Test básico del espejo
- `GUIA_PRUEBAS_ESPEJO.md` - Esta guía

### Archivos Modificados:
- `PruebaEspejoSimple.jsx` - Mejorado con menú y opciones
- `TestPage.jsx` - Añadida nueva ruta para test directo
- `App.jsx` - Ya tenía el botón flotante

### Archivos del Sistema Principal:
- `ARStereoView.jsx` - Lógica del espejo estereoscópico
- `VRLocalVideoOverlay.jsx` - Overlay de video
- `ARPanel.jsx` - Paneles individuales

## 🎮 Controles y Navegación

- **Botón "← Volver/Salir"** - Cierra el test actual
- **Menú de configuración** (en ARStereoView) - Esquina superior izquierda
- **Debug visual** - Información en tiempo real sobre el estado del sistema

## 📱 Compatibilidad

- ✅ Navegadores modernos con soporte de `getUserMedia`
- ✅ HTTPS requerido para acceso a cámara
- ✅ Permisos de cámara necesarios

## 🚨 Problemas Comunes y Soluciones

### "Solo veo un panel"
- Verifica que el CSS `display: flex` esté aplicándose
- Revisa si `arSeparation` tiene un valor > 0
- Confirma que `mirrorRightPanel` esté activado

### "No puedo acceder a la cámara"
- Asegúrate de estar en HTTPS
- Permite el acceso cuando el navegador lo solicite
- Verifica que no haya otra aplicación usando la cámara

### "El panel derecho está negro"
- Confirma que el video del panel izquierdo esté funcionando
- Verifica que la lógica de copia al canvas esté activa
- Revisa los logs en la consola para errores de canvas

---

## 🏁 Siguiente Paso

**EMPIEZA CON EL TEST DIRECTO** para aislar el problema y confirmar que la lógica básica funciona.
