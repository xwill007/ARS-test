# Gestión del Servidor VR - Scripts de Control

Este proyecto incluye varios scripts de lote para facilitar la gestión del servidor de desarrollo VR.
Todos los scripts se encuentran en la carpeta `scripts/`.

## 📁 Scripts Disponibles

### 🚀 Scripts de Inicio
- **`scripts\install.bat`** - Valida Node.js/npm e instala las dependencias del frontend
- **`scripts\start.bat`** - Inicio rápido del servidor con detección automática de IP local y bind en `0.0.0.0`
- **`scripts\restart.bat`** - Reinicio completo con instalación de dependencias y el mismo comportamiento de red
- **`scripts\manage.bat`** - Interfaz de menú interactivo para todas las operaciones

### 🛑 Scripts de Control
- **`scripts\stop.bat`** - Detiene el servidor y libera puertos limpiamente
- **`scripts\kill-ports.bat`** - Liberación forzada de puertos y procesos de desarrollo (emergencias)
- **`scripts\status.bat`** - Verifica el estado actual del servidor, mostrando URL local y URL de red

### 🔧 Scripts de Utilidad
- **`scripts\load-env.bat`** - Carga variables de entorno
- **`scripts\generate-ssl.bat`** - Genera CA local y certificados SSL para HTTPS
- **`scripts\init-ssl.sh`** - Generación de SSL para entornos Linux/Docker

## ⚙️ Configuración con .env

Todos los scripts leen la configuración desde el archivo `.env`. Las principales variables son:

```properties
# Configuración del servidor
VITE_FRONT_IP=localhost
VITE_PORT=3000
VITE_HTTPS=true
VITE_USE_HTTPS=true

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
# Instalar o validar dependencias del frontend
scripts\install.bat

# Opción 1: Menú interactivo (recomendado)
scripts\manage.bat

# Opción 2: Inicio directo
scripts\start.bat

# Opción 3: Reinicio completo (primera vez o después de cambios)
scripts\restart.bat
```

### Detener Servidor
```bash
# Detener limpiamente
scripts\stop.bat

# Limpiar caché también
scripts\stop.bat --clean-cache

# Forzar liberación de puertos (emergencias)
scripts\kill-ports.bat
```

### Verificar Estado
```bash
# Ver estado actual
scripts\status.bat
```

## 🔧 Solución de Problemas

### Puerto Ocupado
1. Ejecuta `scripts\status.bat` para ver qué proceso usa el puerto
2. Usa `scripts\stop.bat` para detener limpiamente
3. Si persiste, usa `scripts\kill-ports.bat` como último recurso

### Errores de Dependencias
1. Usa `scripts\install.bat` para validar e instalar lo necesario
2. Usa `scripts\restart.bat` para reinstalar todo
3. O limpia caché manualmente:
   ```bash
   scripts\stop.bat --clean-cache
   scripts\restart.bat
   ```

### HTTPS para móvil
`scripts\start-movile.bat` usa HTTPS y genera una CA local en `ssl/ca.pem` más un certificado servidor firmado.
Para que el móvil confíe en esa conexión, instala esa CA una sola vez en el dispositivo.

## 📋 Opciones del Menú Interactivo

Al ejecutar `scripts\manage.bat` tienes estas opciones:

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

Una vez iniciado, el servidor escucha en `0.0.0.0` y queda disponible en:
- **Local**: `http://localhost:3000`
- **Red**: `http://<tu-ip-local>:3000`

`scripts\status.bat` muestra la IP de red detectada para que puedas abrirla desde otro dispositivo.

## 🔒 HTTPS para móvil

`scripts\start-movile.bat` arranca con HTTPS usando una CA local de desarrollo.
Si el navegador muestra advertencias, importa `ssl/ca.pem` en el dispositivo para confiar en la conexión.

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
1. `scripts\kill-ports.bat` - Mata todos los procesos en puertos de desarrollo
2. Reinicia el sistema si persisten los problemas
3. Verifica que Node.js esté instalado correctamente

---

**💡 Tip**: Usa `scripts\manage.bat` para una experiencia más amigable con menú interactivo.
