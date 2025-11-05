# Configuración del Entorno - Proyecto VR

Este archivo explica cómo configurar el entorno para ejecutar el proyecto en diferentes equipos.

## Configuración Inicial

1. **Copia el archivo de configuración**:
   ```bash
   copy .env.example .env
   ```

2. **Edita el archivo `.env` según tu configuración local**:

### Configuraciones Principales

#### Servidor de Desarrollo
```properties
# IP del servidor (usar tu IP local para acceso desde otros dispositivos)
VITE_FRONT_IP=192.168.1.11

# Puerto del servidor
VITE_PORT=3000

# Habilitar HTTPS
VITE_HTTPS=true
```

#### Navegador Predeterminado
```properties
# Opciones: chrome, firefox, edge, msedge
DEFAULT_BROWSER=chrome

# Rutas de instalación (ajustar según tu sistema)
CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
FIREFOX_PATH=C:\Program Files\Mozilla Firefox\firefox.exe
EDGE_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
```

#### Configuración SSL
```properties
# Datos para el certificado SSL
SSL_COUNTRY=CO
SSL_STATE=Antioquia
SSL_CITY=Medellin
SSL_ORGANIZATION=Desarrollo

# Ruta de OpenSSL (viene con Git)
OPENSSL_PATH=C:\Program Files\Git\usr\bin\openssl.exe
```

#### Optimización de Instalación
```properties
# Acelerar instalación de dependencias
SKIP_OPTIONAL_DEPS=true
SKIP_AUDIT=true
SKIP_FUND=true
LOG_LEVEL=error
```

#### Configuración de Desarrollo
```properties
# Abrir navegador automáticamente
AUTO_OPEN_BROWSER=true

# Ignorar errores de certificado SSL
IGNORE_CERT_ERRORS=true

# Limpiar pantalla al iniciar
CLEAR_SCREEN=false
```

## Scripts Disponibles

### `start.bat`
- Inicio rápido del proyecto
- Instala dependencias solo si no existen
- Usa configuración del `.env`

### `restart.bat`
- Reinicio completo del proyecto
- Limpia cache y reinstala dependencias
- Regenera certificados SSL
- Usa configuración del `.env`

### `start-mobile.bat`
- Configurado para desarrollo móvil
- Usa IP específica para acceso desde dispositivos móviles

## Configuraciones por Equipo

### Equipo de Desarrollo Principal
```properties
VITE_FRONT_IP=localhost
DEFAULT_BROWSER=chrome
AUTO_OPEN_BROWSER=true
```

### Servidor de Desarrollo Local
```properties
VITE_FRONT_IP=192.168.1.11
DEFAULT_BROWSER=firefox
AUTO_OPEN_BROWSER=false
```

### Equipo con Instalaciones Personalizadas
```properties
CHROME_PATH=D:\Programs\Chrome\chrome.exe
OPENSSL_PATH=D:\Tools\OpenSSL\bin\openssl.exe
NODE_PATH=D:\NodeJS
```

## Solución de Problemas

### El navegador no se abre automáticamente
1. Verifica la ruta del navegador en el `.env`
2. Cambia `DEFAULT_BROWSER` a otro navegador disponible
3. Establece `AUTO_OPEN_BROWSER=false` para deshabilitar

### Errores de certificado SSL
1. Verifica que Git esté instalado (incluye OpenSSL)
2. Ajusta `OPENSSL_PATH` en el `.env`
3. Establece `IGNORE_CERT_ERRORS=true`

### Problemas de instalación de dependencias
1. Establece `FORCE_CLEAN_CACHE=true`
2. Establece `FORCE_REINSTALL=true`
3. Ejecuta `restart.bat` en lugar de `start.bat`

### El proyecto no es accesible desde otros dispositivos
1. Cambia `VITE_FRONT_IP` por tu IP local
2. Configura el firewall para permitir el puerto especificado
3. Asegúrate de que todos los dispositivos estén en la misma red

## Ejemplo de Configuración Completa

```properties
# Configuración para desarrollo local con acceso móvil
VITE_FRONT_IP=192.168.1.100
VITE_PORT=3000
VITE_HTTPS=true
DEFAULT_BROWSER=chrome
AUTO_OPEN_BROWSER=true
IGNORE_CERT_ERRORS=true
FORCE_CLEAN_CACHE=false
SKIP_AUDIT=true
LOG_LEVEL=error
```
