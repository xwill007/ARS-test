# Gestión del Servidor VR - Scripts de Control

Este proyecto incluye varios scripts de lote para facilitar la gestión del servidor de desarrollo VR.

## 📁 Scripts Disponibles

### 🚀 Scripts de Inicio
- **`start.bat`** - Inicio rápido del servidor
- **`restart.bat`** - Reinicio completo con instalación de dependencias
- **`manage.bat`** - Interfaz de menú interactivo para todas las operaciones

### 🛑 Scripts de Control
- **`stop.bat`** - Detiene el servidor y libera puertos limpiamente
- **`kill-ports.bat`** - Liberación forzada de puertos (emergencias)
- **`status.bat`** - Verifica el estado actual del servidor

### 🔧 Scripts de Utilidad
- **`load-env.bat`** - Carga variables de entorno (usado por otros scripts)

## ⚙️ Configuración con .env

Todos los scripts leen la configuración desde el archivo `.env`. Las principales variables son:

```properties
# Configuración del servidor
VITE_FRONT_IP=localhost
VITE_PORT=3000
VITE_HTTPS=true

# Navegador por defecto
DEFAULT_BROWSER=chrome
AUTO_OPEN_BROWSER=true

# Rutas de navegadores
CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
FIREFOX_PATH=C:\Program Files\Mozilla Firefox\firefox.exe
EDGE_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
```

## 🚦 Uso Básico

### Inicio Rápido
```bash
# Opción 1: Menú interactivo (recomendado)
manage.bat

# Opción 2: Inicio directo
start.bat

# Opción 3: Reinicio completo (primera vez o después de cambios)
restart.bat
```

### Detener Servidor
```bash
# Detener limpiamente
stop.bat

# Limpiar caché también
stop.bat --clean-cache

# Forzar liberación de puertos (emergencias)
kill-ports.bat
```

### Verificar Estado
```bash
# Ver estado actual
status.bat
```

## 🔧 Solución de Problemas

### Puerto Ocupado
1. Ejecuta `status.bat` para ver qué proceso usa el puerto
2. Usa `stop.bat` para detener limpiamente
3. Si persiste, usa `kill-ports.bat` para forzar

### Errores de Dependencias
1. Usa `restart.bat` para reinstalar todo
2. O limpia caché manualmente:
   ```bash
   stop.bat --clean-cache
   restart.bat
   ```

### Certificados SSL
Los scripts generan automáticamente certificados SSL para HTTPS.
Si hay problemas, elimina la carpeta `ssl/` y ejecuta `restart.bat`.

## 📋 Opciones del Menú Interactivo

Al ejecutar `manage.bat` tienes estas opciones:

1. **Iniciar servidor** - Inicio rápido sin reinstalar dependencias
2. **Reiniciar servidor** - Reinstala dependencias e inicia
3. **Detener servidor** - Para todos los procesos limpiamente
4. **Ver estado** - Muestra información del servidor actual
5. **Liberar puertos** - Fuerza liberación de puertos ocupados
6. **Limpiar caché** - Elimina node_modules y caché
7. **Configurar .env** - Abre el archivo de configuración
8. **Ver logs** - Muestra logs de errores de npm
9. **Salir** - Cierra el menú

## 🌐 URLs del Servidor

Una vez iniciado, el servidor estará disponible en:
- **HTTPS**: `https://localhost:3000` (por defecto)
- **HTTP**: `http://localhost:3000` (si VITE_HTTPS=false)

## 🔒 Certificados SSL

Los scripts generan automáticamente certificados SSL autofirmados para desarrollo.
El navegador mostrará una advertencia de seguridad que puedes ignorar en desarrollo.

## 📝 Personalización

### Cambiar Puerto
Edita el archivo `.env`:
```properties
VITE_PORT=3001
```

### Cambiar Navegador
Edita el archivo `.env`:
```properties
DEFAULT_BROWSER=firefox
# o chrome, edge, msedge
```

### Desactivar Apertura Automática del Navegador
```properties
AUTO_OPEN_BROWSER=false
```

## 🚨 Comandos de Emergencia

Si nada funciona:
1. `kill-ports.bat` - Mata todos los procesos en puertos de desarrollo
2. Reinicia el sistema si persisten los problemas
3. Verifica que Node.js esté instalado correctamente

---

**💡 Tip**: Usa `manage.bat` para una experiencia más amigable con menú interactivo.
