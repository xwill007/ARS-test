@echo off
setlocal enabledelayedexpansion

:: Set environment variables
set "VITE_FRONT_IP=192.168.1.11"
set "VITE_PORT=3000"
set "VITE_HTTPS=true"

:: Kill any running Node processes
taskkill /F /IM node.exe >nul 2>&1

:: Generate SSL certificates
call generate-ssl.bat

:: Start the server
echo Starting server at https://%VITE_FRONT_IP%:%VITE_PORT%
npx vite --host %VITE_FRONT_IP% --port %VITE_PORT%

pause