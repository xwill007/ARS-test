@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo      DETENIENDO SERVIDOR DE DESARROLLO VR
echo ===================================================
echo.

:: Cargar configuración desde .env
cd /d "%~dp0"
if exist ".env" (
    echo Cargando configuración desde .env...
    for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
        set "line=%%a"
        if not "!line:~0,1!"=="#" if not "!line!"=="" (
            set "%%a=%%b"
        )
    )
) else (
    echo Archivo .env no encontrado. Usando valores por defecto...
    set "VITE_FRONT_IP=localhost"
    set "VITE_PORT=3000"
)

echo.
echo Deteniendo procesos del servidor...

:: 1. Detener procesos de Node.js
echo [1/5] Deteniendo procesos de Node.js...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel%==0 (
    echo    ✓ Procesos de Node.js detenidos
) else (
    echo    ℹ No se encontraron procesos de Node.js en ejecución
)

:: 2. Detener procesos de npm
echo [2/5] Deteniendo procesos de npm...
taskkill /F /IM npm.exe >nul 2>&1
if %errorlevel%==0 (
    echo    ✓ Procesos de npm detenidos
) else (
    echo    ℹ No se encontraron procesos de npm en ejecución
)

:: 3. Detener procesos de Vite
echo [3/5] Deteniendo procesos de Vite...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%VITE_PORT% "') do (
    if not "%%a"=="" (
        echo    Matando proceso con PID: %%a
        taskkill /F /PID %%a >nul 2>&1
    )
)

:: 4. Liberar puerto específico si está ocupado
echo [4/5] Verificando y liberando puerto %VITE_PORT%...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%VITE_PORT% " ^| findstr "LISTENING"') do (
    if not "%%a"=="" (
        echo    Liberando puerto %VITE_PORT% (PID: %%a)
        taskkill /F /PID %%a >nul 2>&1
        if %errorlevel%==0 (
            echo    ✓ Puerto %VITE_PORT% liberado exitosamente
        ) else (
            echo    ⚠ No se pudo liberar el puerto %VITE_PORT%
        )
    )
)

:: 5. Verificar puertos adicionales comunes de desarrollo
echo [5/5] Verificando otros puertos de desarrollo...
for %%p in (3001 3002 5173 5174 8080 8081) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%%p " ^| findstr "LISTENING"') do (
        if not "%%a"=="" (
            echo    Liberando puerto %%p (PID: %%a)
            taskkill /F /PID %%a >nul 2>&1
        )
    )
)

:: 6. Limpiar procesos huérfanos relacionados con el proyecto
echo.
echo Limpiando procesos huérfanos...
wmic process where "CommandLine like '%%vite%%' or CommandLine like '%%npm run dev%%'" delete >nul 2>&1

:: 7. Mostrar estado final de puertos
echo.
echo Verificando estado final de puertos...
netstat -aon | findstr ":%VITE_PORT% " | findstr "LISTENING" >nul
if %errorlevel%==0 (
    echo    ⚠ Puerto %VITE_PORT% aún parece estar en uso
    echo    Puertos actualmente en escucha en %VITE_PORT%:
    netstat -aon | findstr ":%VITE_PORT% " | findstr "LISTENING"
) else (
    echo    ✓ Puerto %VITE_PORT% está libre
)

:: 8. Opcional: Limpiar caché si se especifica
if "%1"=="--clean-cache" (
    echo.
    echo Limpiando caché de npm...
    cd /d "%~dp0ApprendeVr\frontend"
    npm cache clean --force >nul 2>&1
    echo    ✓ Caché limpiado
)

:: 9. Mostrar resumen
echo.
echo ===================================================
echo                    RESUMEN
echo ===================================================
echo ✓ Servidor VR detenido correctamente
echo ✓ Puerto %VITE_PORT% liberado
echo ✓ Procesos Node.js terminados
echo.
if "%1"=="--clean-cache" (
    echo ✓ Caché limpiado
    echo.
)
echo Para reiniciar el servidor, ejecuta:
echo   start.bat    - Inicio rápido
echo   restart.bat  - Instalación completa
echo.
echo Para limpiar caché en la próxima parada:
echo   stop.bat --clean-cache
echo ===================================================

:: Pausa opcional
if not "%1"=="--no-pause" (
    echo.
    pause
)
