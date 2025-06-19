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
