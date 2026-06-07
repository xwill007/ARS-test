@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo            INSTALADOR DEL ENTORNO VR
echo ===================================================
echo.

cd /d "%~dp0..\"

where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js no está instalado o no está en PATH.
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm no está disponible en PATH.
    exit /b 1
)

echo Node.js y npm detectados.

cd /d "%~dp0..\ApprendeVr\frontend"

if not exist "package.json" (
    echo ERROR: No se encontró package.json en el frontend.
    exit /b 1
)

set "NEEDS_INSTALL=false"
if not exist "node_modules" set "NEEDS_INSTALL=true"
if not exist "node_modules\.bin\vite.cmd" set "NEEDS_INSTALL=true"

if /i "%NEEDS_INSTALL%"=="false" (
    echo Dependencias ya instaladas.
) else (
    echo Instalando dependencias del frontend...
    call npm install
    if errorlevel 1 (
        echo ERROR: Falló la instalación de dependencias.
        exit /b 1
    )
)

if not exist "node_modules\.bin\vite.cmd" (
    echo ERROR: Vite no quedó instalado correctamente.
    exit /b 1
)

echo.
echo Instalación completada correctamente.
exit /b 0