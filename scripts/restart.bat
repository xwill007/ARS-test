@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo           REINICIO COMPLETO DEL PROYECTO VR
echo ===================================================

:: Cargar configuración del .env
echo Navegando al directorio del proyecto...
cd /d "%~dp0..\"
if exist ".env" (
    echo Cargando configuración desde .env...
    call :loadEnv
) else (
    echo Archivo .env no encontrado. Creando configuración por defecto...
    call :setDefaults
)

echo Navegando al directorio del frontend...
cd /d "%~dp0..\ApprendeVr\frontend"

echo Deteniendo procesos de Node.js si están en ejecución...
taskkill /F /IM node.exe >nul 2>&1

if /i "%FORCE_CLEAN_CACHE%"=="true" (
    echo Limpiando caché de npm...
    call npm cache clean --force
)

if exist node_modules if /i "%FORCE_REINSTALL%"=="true" (
    echo Eliminando node_modules...
    rmdir /s /q node_modules
)

echo Eliminando certificados SSL existentes...
if exist ssl (
    rmdir /s /q ssl
)
mkdir ssl

echo Generando nuevos certificados SSL...
call :generateSSL

echo Instalando dependencias...
call :installDependencies

echo Iniciando la aplicación con HTTPS...
call :startApplication

echo ===================================================
echo Proceso completado. La aplicación debería estar disponible en:
echo https://%VITE_FRONT_IP%:%VITE_PORT%
echo ===================================================
pause
goto :eof
:: Configurar variables de entorno
echo Configurando variables de entorno...
set "VITE_FRONT_IP=192.168.1.11"
set "VITE_PORT=3000"
set "VITE_HTTPS=true"

:: Configurar certificados SSL
echo Configurando certificados SSL...
if not exist ssl (
    mkdir ssl
) else (
    echo Eliminando certificados SSL existentes...
    rmdir /s /q ssl 2>nul
    mkdir ssl
)

echo Generando nuevos certificados SSL...
"C:\Program Files\Git\usr\bin\openssl.exe" req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/C=CO/ST=Antioquia/L=Medellin/O=Desarrollo/CN=192.168.1.11" 2>nul

if not exist ssl\key.pem (
    echo Error al generar los certificados SSL.
    pause
    exit /b 1
)

echo Certificados generados exitosamente en la carpeta ssl/

:: Instalar dependencias básicas primero
echo Instalando dependencias básicas...
call npm install --no-optional --no-audit --no-fund --loglevel=error

:: Instalar Vite específicamente para asegurar la compatibilidad
echo Instalando Vite...
call npm install vite@latest --save-dev --no-audit --no-fund --loglevel=error

:: Instalar Rollup manualmente para evitar problemas
echo Instalando Rollup...
call npm install rollup @rollup/rollup-win32-x64-msvc --save-dev --no-audit --no-fund --loglevel=error

:: Instalar el resto de dependencias
echo Instalando dependencias restantes...
call npm install --no-audit --no-fund --loglevel=error

if errorlevel 1 (
    echo Error al instalar las dependencias. Reintentando con limpieza de caché...
    call npm cache clean --force
    call npm install --force --no-audit --no-fund --loglevel=error
    
    if errorlevel 1 (
        echo Error cr├¡tico al instalar dependencias.
        pause
        exit /b 1
    )
)

echo Iniciando la aplicaci├│n con HTTPS en https://%VITE_FRONT_IP%:%VITE_PORT%
start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --ignore-certificate-errors "https://%VITE_FRONT_IP%:%VITE_PORT%"

:: Usar npx para asegurar que usamos el Vite local
echo Iniciando el servidor de desarrollo...
call npx vite --host %VITE_FRONT_IP% --port %VITE_PORT% --clearScreen false

if errorlevel 1 (
    echo Error al iniciar la aplicaci├│n.
    pause
    exit /b 1
)

echo.
echo ===================================================
echo La aplicaci├│n deber├¡a estar disponible en:
echo https://%VITE_FRONT_IP%:%VITE_PORT%
echo.
echo Si ves un error de certificado en el navegador:
echo 1. Haz clic en "Avanzado"
echo 2. Haz clic en "Continuar a %VITE_FRONT_IP% (no seguro)"
echo ===================================================

pause

:: Función para cargar variables del archivo .env
:loadEnv
for /f "usebackq tokens=1,2 delims==" %%a in ("%~dp0..\.env") do (
    set "line=%%a"
    if not "!line:~0,1!"=="#" if not "!line!"=="" (
        set "%%a=%%b"
    )
)
goto :eof

:: Función para establecer valores por defecto
:setDefaults
set "VITE_FRONT_IP=localhost"
set "VITE_PORT=3000"
set "VITE_HTTPS=true"
set "DEFAULT_BROWSER=chrome"
set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
set "FIREFOX_PATH=C:\Program Files\Mozilla Firefox\firefox.exe"
set "EDGE_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
set "SSL_COUNTRY=CO"
set "SSL_STATE=Antioquia"
set "SSL_CITY=Medellin"
set "SSL_ORGANIZATION=Desarrollo"
set "SSL_COMMON_NAME=%VITE_FRONT_IP%"
set "OPENSSL_PATH=C:\Program Files\Git\usr\bin\openssl.exe"
set "CERT_DAYS=365"
set "CERT_KEY_SIZE=4096"
set "SKIP_OPTIONAL_DEPS=true"
set "SKIP_AUDIT=true"
set "SKIP_FUND=true"
set "LOG_LEVEL=error"
set "AUTO_OPEN_BROWSER=true"
set "CLEAR_SCREEN=false"
set "IGNORE_CERT_ERRORS=true"
goto :eof

:: Función para generar certificados SSL
:generateSSL
echo Generando certificados SSL con configuración personalizada...
if exist "%OPENSSL_PATH%" (
    "%OPENSSL_PATH%" req -x509 -newkey rsa:%CERT_KEY_SIZE% -keyout ssl/key.pem -out ssl/cert.pem -days %CERT_DAYS% -nodes -subj "/C=%SSL_COUNTRY%/ST=%SSL_STATE%/L=%SSL_CITY%/O=%SSL_ORGANIZATION%/CN=%SSL_COMMON_NAME%" 2>nul
    if exist ssl\key.pem (
        echo Certificados SSL generados exitosamente
    ) else (
        echo Error al generar certificados SSL
        pause
        exit /b 1
    )
) else (
    echo OpenSSL no encontrado en: %OPENSSL_PATH%
    echo Por favor, instala Git o ajusta la ruta en el archivo .env
    pause
    exit /b 1
)
goto :eof

:: Función para instalar dependencias
:installDependencies
set "NPM_FLAGS="
if /i "%SKIP_OPTIONAL_DEPS%"=="true" set "NPM_FLAGS=!NPM_FLAGS! --no-optional"
if /i "%SKIP_AUDIT%"=="true" set "NPM_FLAGS=!NPM_FLAGS! --no-audit"
if /i "%SKIP_FUND%"=="true" set "NPM_FLAGS=!NPM_FLAGS! --no-fund"
if not "%LOG_LEVEL%"=="" set "NPM_FLAGS=!NPM_FLAGS! --loglevel=%LOG_LEVEL%"

echo Instalando dependencias básicas...
call npm install !NPM_FLAGS!

echo Instalando Vite...
call npm install vite@latest --save-dev !NPM_FLAGS!

echo Instalando Rollup...
call npm install rollup @rollup/rollup-win32-x64-msvc --save-dev !NPM_FLAGS!

if errorlevel 1 (
    echo Error al instalar las dependencias. Reintentando con limpieza de caché...
    call npm cache clean --force
    call npm install --force !NPM_FLAGS!
    
    if errorlevel 1 (
        echo Error crítico al instalar dependencias.
        pause
        exit /b 1
    )
)
goto :eof

:: Función para iniciar la aplicación
:startApplication
:: Determinar navegador a usar
call :getBrowser
set "VITE_FLAGS=--host %VITE_FRONT_IP% --port %VITE_PORT%"
if /i "%CLEAR_SCREEN%"=="false" set "VITE_FLAGS=!VITE_FLAGS! --clearScreen false"

if /i "%AUTO_OPEN_BROWSER%"=="true" if not "%BROWSER_PATH%"=="" (
    echo Abriendo navegador: %DEFAULT_BROWSER%
    if /i "%IGNORE_CERT_ERRORS%"=="true" (
        start "" "%BROWSER_PATH%" --ignore-certificate-errors "https://%VITE_FRONT_IP%:%VITE_PORT%"
    ) else (
        start "" "%BROWSER_PATH%" "https://%VITE_FRONT_IP%:%VITE_PORT%"
    )
)

echo Iniciando el servidor de desarrollo...
call npx vite !VITE_FLAGS!

if errorlevel 1 (
    echo Error al iniciar la aplicación.
    pause
    exit /b 1
)
goto :eof

:: Función para obtener la ruta del navegador
:getBrowser
set "BROWSER_PATH="
if /i "%DEFAULT_BROWSER%"=="chrome" set "BROWSER_PATH=%CHROME_PATH%"
if /i "%DEFAULT_BROWSER%"=="firefox" set "BROWSER_PATH=%FIREFOX_PATH%"
if /i "%DEFAULT_BROWSER%"=="edge" set "BROWSER_PATH=%EDGE_PATH%"
if /i "%DEFAULT_BROWSER%"=="msedge" set "BROWSER_PATH=%EDGE_PATH%"

:: Verificar si el navegador existe
if not exist "%BROWSER_PATH%" (
    echo Advertencia: No se encontró %DEFAULT_BROWSER% en "%BROWSER_PATH%"
    echo Buscando navegadores alternativos...
    
    if exist "%CHROME_PATH%" (
        set "BROWSER_PATH=%CHROME_PATH%"
        set "DEFAULT_BROWSER=chrome"
        echo Usando Chrome como alternativa
    ) else if exist "%FIREFOX_PATH%" (
        set "BROWSER_PATH=%FIREFOX_PATH%"
        set "DEFAULT_BROWSER=firefox"
        echo Usando Firefox como alternativa
    ) else if exist "%EDGE_PATH%" (
        set "BROWSER_PATH=%EDGE_PATH%"
        set "DEFAULT_BROWSER=edge"
        echo Usando Edge como alternativa
    ) else (
        echo No se encontró ningún navegador. La aplicación se iniciará sin abrir navegador.
        set "BROWSER_PATH="
        set "AUTO_OPEN_BROWSER=false"
    )
)
goto :eof