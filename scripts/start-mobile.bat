@echo off
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"

:: Verificar Docker (necesario para el contenedor MySQL del backend) e intentar iniciarlo si
:: no esta corriendo.
echo Verificando Docker...
docker info >nul 2>&1
if errorlevel 1 (
  echo Docker no esta corriendo, iniciando Docker Desktop...
  start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  set "attempts=0"
  :waitdocker
  timeout /t 3 /nobreak >nul
  docker info >nul 2>&1
  if errorlevel 1 (
    set /a attempts+=1
    if !attempts! GEQ 40 (
      echo Docker no arranco luego de 2 minutos. Abrelo manualmente y vuelve a correr este script.
      pause
      exit /b 1
    )
    goto waitdocker
  )
)

echo Levantando contenedores del backend (MySQL)...
pushd "%SCRIPT_DIR%..\ApprendeVr\backend"
docker compose up -d
popd

echo Navegando al directorio del proyecto...
cd /d "%SCRIPT_DIR%..\ApprendeVr\frontend"

:: Detectar la IP local automaticamente (primera IPv4 no loopback)
set "VITE_FRONT_IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  if not defined VITE_FRONT_IP (
    set "candidate=%%a"
    set "candidate=!candidate: =!"
    if not "!candidate!"=="127.0.0.1" set "VITE_FRONT_IP=!candidate!"
  )
)
if not defined VITE_FRONT_IP set "VITE_FRONT_IP=127.0.0.1"

set "VITE_PORT=3000"
set "VITE_HTTPS=true"

:: Kill any running Node processes
taskkill /F /IM node.exe >nul 2>&1

:: Generate SSL certificates
call generate-ssl.bat

:: Iniciar el backend (NestJS) en una ventana aparte. El frontend le pega vía el proxy /api de
:: Vite (ver vite.config.js), asi que tiene que estar arriba antes de que alguien intente
:: loguearse.
echo Iniciando backend (NestJS)...
start "APV-Backend" /MIN cmd /c "cd /d "%SCRIPT_DIR%..\ApprendeVr\backend" && npm run start:dev"

:: Start the server
echo Starting server at https://%VITE_FRONT_IP%:%VITE_PORT%
npx vite --host %VITE_FRONT_IP% --port %VITE_PORT%

:: Al cerrar el frontend (Ctrl+C), detener tambien el backend
echo Deteniendo backend...
taskkill /FI "WINDOWTITLE eq APV-Backend*" /T /F >nul 2>&1

pause
