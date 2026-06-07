@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo              INICIO RÁPIDO DEL PROYECTO VR
echo ===================================================

REM Cambiar al directorio del proyecto
cd /d "%~dp0..\"

REM Cargar configuración del .env
if exist "%~dp0..\.env" (
    echo Cargando configuración desde .env...
    call :loadEnv
) else (
    echo Archivo .env no encontrado. Usando valores por defecto...
    call :setDefaults
)

REM Cambiar al directorio del frontend
cd /d "%~dp0..\ApprendeVr\frontend"

call :setNetworkDefaults

REM Verificar si existen las dependencias
if not exist "node_modules" (
    echo Instalando dependencias por primera vez...
    call :installDependencies
) else (
    echo Dependencias ya instaladas. Iniciando directamente...
)

echo Iniciando el servidor de desarrollo...
call :startDevelopmentServer

pause
goto :eof

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
set "DEFAULT_BROWSER=chrome"
set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
set "FIREFOX_PATH=C:\Program Files\Mozilla Firefox\firefox.exe"
set "EDGE_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
set "SKIP_OPTIONAL_DEPS=true"
set "SKIP_AUDIT=true"
set "SKIP_FUND=true"
set "LOG_LEVEL=error"
set "AUTO_OPEN_BROWSER=true"
set "CLEAR_SCREEN=false"
set "IGNORE_CERT_ERRORS=true"
goto :eof

:: Función para ajustar red local y bind seguro
:setNetworkDefaults
set "VITE_BIND_HOST=0.0.0.0"
set "VITE_FRONT_IP="

for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /R /C:"192\.168\."') do (
    if not defined VITE_FRONT_IP set "VITE_FRONT_IP=%%i"
)

if defined VITE_FRONT_IP set "VITE_FRONT_IP=%VITE_FRONT_IP: =%"
if not defined VITE_FRONT_IP set "VITE_FRONT_IP=localhost"
goto :eof

:: Función para instalar dependencias
:installDependencies
set "NPM_FLAGS="
if /i "%SKIP_OPTIONAL_DEPS%"=="true" set "NPM_FLAGS=!NPM_FLAGS! --no-optional"
if /i "%SKIP_AUDIT%"=="true" set "NPM_FLAGS=!NPM_FLAGS! --no-audit"
if /i "%SKIP_FUND%"=="true" set "NPM_FLAGS=!NPM_FLAGS! --no-fund"
if not "%LOG_LEVEL%"=="" set "NPM_FLAGS=!NPM_FLAGS! --loglevel=%LOG_LEVEL%"

call npm install !NPM_FLAGS!
goto :eof

:: Función para iniciar el servidor de desarrollo
:startDevelopmentServer
:: Determinar navegador a usar
call :getBrowser

set "VITE_FLAGS=--host %VITE_BIND_HOST% --port %VITE_PORT%"
if /i "%CLEAR_SCREEN%"=="false" set "VITE_FLAGS=!VITE_FLAGS! --clearScreen false"

if /i "%AUTO_OPEN_BROWSER%"=="true" if not "%BROWSER_PATH%"=="" (
    echo Abriendo navegador: %DEFAULT_BROWSER%
    if /i "%IGNORE_CERT_ERRORS%"=="true" (
        start "" "%BROWSER_PATH%" --ignore-certificate-errors "https://%VITE_FRONT_IP%:%VITE_PORT%"
    ) else (
        start "" "%BROWSER_PATH%" "https://%VITE_FRONT_IP%:%VITE_PORT%"
    )
)

call npm run dev -- !VITE_FLAGS!
goto :eof

:: Función para obtener la ruta del navegador
:getBrowser
set "BROWSER_PATH="
if /i "%DEFAULT_BROWSER%"=="chrome" set "BROWSER_PATH=%CHROME_PATH%"
if /i "%DEFAULT_BROWSER%"=="firefox" set "BROWSER_PATH=%FIREFOX_PATH%"
if /i "%DEFAULT_BROWSER%"=="edge" set "BROWSER_PATH=%EDGE_PATH%"
if /i "%DEFAULT_BROWSER%"=="msedge" set "BROWSER_PATH=%EDGE_PATH%"

:: Verificar si el navegador existe y buscar alternativas si es necesario
if not exist "%BROWSER_PATH%" (
    if exist "%CHROME_PATH%" (
        set "BROWSER_PATH=%CHROME_PATH%"
        set "DEFAULT_BROWSER=chrome"
    ) else if exist "%FIREFOX_PATH%" (
        set "BROWSER_PATH=%FIREFOX_PATH%"
        set "DEFAULT_BROWSER=firefox"
    ) else if exist "%EDGE_PATH%" (
        set "BROWSER_PATH=%EDGE_PATH%"
        set "DEFAULT_BROWSER=edge"
    ) else (
        set "BROWSER_PATH="
        set "AUTO_OPEN_BROWSER=false"
    )
)
goto :eof