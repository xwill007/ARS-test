@echo off
setlocal enabledelayedexpansion

echo Navegando al directorio del proyecto...
cd /d "%~dp0ApprendeVr\front-r3f"

@echo off
echo Deteniendo procesos de Node.js si están en ejecución...
taskkill /F /IM node.exe >nul 2>&1

echo Limpiando caché de npm...
cd /d %~dp0
call npm cache clean --force

if exist node_modules (
    echo Eliminando node_modules...
    rmdir /s /q node_modules
)

echo Eliminando certificados SSL existentes...
if exist ssl (
    rmdir /s /q ssl
    mkdir ssl
)

echo Generando nuevos certificados SSL...
call generate-ssl.bat

echo Instalando dependencias...
call npm install

echo Iniciando la aplicación con HTTPS...
start "" "%ProgramFiles%\Mozilla Firefox\firefox.exe" -new-tab "https://%FRONT_IP%:3000"
call npm run dev -- --host %FRONT_IP% --port 3000 --https

echo Proceso completado. La aplicación debería estar disponible en https://%FRONT_IP%:3000
pause
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