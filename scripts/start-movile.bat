@echo off
setlocal enabledelayedexpansion

echo Navegando al directorio del proyecto...
cd /d "%~dp0..\ApprendeVr\frontend"

call "%~dp0install.bat"
if errorlevel 1 (
	echo.
	echo No se pudo completar la instalación previa.
	pause
	exit /b 1
)

:: Set environment variables
set "VITE_PORT=3000"
set "VITE_HTTPS=true"
set "VITE_USE_HTTPS=true"
set "VITE_BIND_HOST=0.0.0.0"
set "VITE_FRONT_IP="

for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /R /C:"192\.168\."') do (
	if not defined VITE_FRONT_IP set "VITE_FRONT_IP=%%i"
)

if defined VITE_FRONT_IP set "VITE_FRONT_IP=%VITE_FRONT_IP: =%"
if not defined VITE_FRONT_IP set "VITE_FRONT_IP=localhost"

:: Kill any running Node processes
taskkill /F /IM node.exe >nul 2>&1

:: Generate SSL certificates
call "%~dp0generate-ssl.bat"

:: Start the server
echo Starting server at https://%VITE_FRONT_IP%:%VITE_PORT%
npx vite --host %VITE_BIND_HOST% --port %VITE_PORT%

pause