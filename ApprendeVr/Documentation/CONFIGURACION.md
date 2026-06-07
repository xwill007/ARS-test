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
# Host informativo / URL de red. Los scripts de inicio detectan la IP local automáticamente.
VITE_FRONT_IP=localhost

# Puerto del servidor
VITE_PORT=3000

# HTTPS activo para start-movile.bat
VITE_HTTPS=true
VITE_USE_HTTPS=true
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
# CA local y certificado servidor para desarrollo
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

Todos los scripts están en la carpeta `scripts/`.

### `scripts\install.bat`
- Valida que Node.js y npm existan
- Instala las dependencias del frontend si faltan
- Verifica que Vite quede disponible antes de iniciar

### `scripts\start.bat`
- Inicio rápido del proyecto
- Instala dependencias solo si no existen
- Detecta la IP local automáticamente y escucha en `0.0.0.0`

### `scripts\restart.bat`
- Reinicio completo del proyecto
- Limpia cache y reinstala dependencias
- Regenera certificados SSL
- Usa la misma detección de IP local que `start.bat`

### `scripts\start-movile.bat`
- Configurado para desarrollo móvil
- Detecta la IP `192.168.x.x` local y publica esa URL de red
- Usa HTTPS con una CA local firmada para soportar sensores y `getUserMedia`
- Si el móvil no confía en la conexión, instala `ssl/ca.pem` una sola vez

## Configuraciones por Equipo

### Equipo de Desarrollo Principal
```properties
VITE_FRONT_IP=localhost
DEFAULT_BROWSER=chrome
AUTO_OPEN_BROWSER=true
```

### Servidor de Desarrollo Local
```properties
VITE_FRONT_IP=localhost
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
1. Ejecuta `scripts\install.bat` para validar e instalar dependencias
2. Establece `FORCE_CLEAN_CACHE=true`
3. Establece `FORCE_REINSTALL=true`
4. Ejecuta `scripts\restart.bat` en lugar de `scripts\start.bat`

### El proyecto no es accesible desde otros dispositivos
1. Ejecuta `scripts\start-movile.bat` o `scripts\restart.bat` para que detecten la IP local
2. Configura el firewall para permitir el puerto especificado
3. Asegúrate de que todos los dispositivos estén en la misma red

### El móvil muestra que no confía en el certificado
1. Instala la CA de desarrollo desde `ApprendeVr/frontend/ssl/ca.pem`
2. Reinicia el navegador después de confiar el certificado
3. Vuelve a abrir `https://192.168.1.118:3000/` o la IP que te muestre `scripts\start-movile.bat`

#### Android
1. Copia `ApprendeVr/frontend/ssl/ca.pem` al teléfono, por ejemplo a `Download/ca.pem`
2. No se instala desde Chrome: hacelo desde **Ajustes del teléfono**
3. Si el sistema no la reconoce, renómbrala a `ca.crt` o `ca.cer`
4. Buscá la opción **Instalar un certificado** o **Certificados de usuario** en **Ajustes > Seguridad**
5. Elegí **Certificado CA** y seleccioná el archivo
6. Confirmá la instalación y reiniciá Chrome

Si no encontrás esa opción, buscá dentro de Ajustes por las palabras `certificado`, `credenciales` o `CA`; cambia un poco según la versión de Android.

#### iPhone
1. Copia `ApprendeVr/frontend/ssl/ca.pem` al iPhone con AirDrop, Files o iCloud Drive
2. Ábrelo para instalar el perfil/certificado
3. Ve a **Ajustes > General > Información > Ajustes de confianza de certificados**
4. Activa la confianza total para la CA instalada
5. Reinicia Safari y vuelve a abrir la URL HTTPS

#### Si todavía no funcionan los sensores
1. Verifica que estés entrando por `https` y no por `http`
2. Borra la caché del navegador del móvil
3. Asegúrate de dar permisos de cámara y movimiento cuando el navegador los pida
4. Revisa que el navegador no esté abriendo una copia vieja en una pestaña previa

## Ejemplo de Configuración Completa

```properties
# Configuración para desarrollo local con acceso móvil
VITE_FRONT_IP=localhost
VITE_PORT=3000
VITE_HTTPS=true
VITE_USE_HTTPS=true
DEFAULT_BROWSER=chrome
AUTO_OPEN_BROWSER=true
IGNORE_CERT_ERRORS=true
FORCE_CLEAN_CACHE=false
SKIP_AUDIT=true
LOG_LEVEL=error
```
