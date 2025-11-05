@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo        VERIFICADOR DE ESTADO DEL SERVIDOR
echo ===================================================
echo.

:: Cargar configuración desde .env
if exist ".env" (
    for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
        set "line=%%a"
        if not "!line:~0,1!"=="#" if not "!line!"=="" (
            set "%%a=%%b"
        )
    )
) else (
    set "VITE_FRONT_IP=localhost"
    set "VITE_PORT=3000"
)

echo Configuración actual:
echo   IP: %VITE_FRONT_IP%
echo   Puerto: %VITE_PORT%
echo   URL: https://%VITE_FRONT_IP%:%VITE_PORT%
echo.

:: Verificar si el servidor está corriendo
echo Verificando estado del servidor...
netstat -aon | findstr ":%VITE_PORT% " | findstr "LISTENING" >nul
if %errorlevel%==0 (
    echo ✓ Servidor ACTIVO en puerto %VITE_PORT%
    echo.
    echo Procesos usando el puerto %VITE_PORT%:
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%VITE_PORT% " ^| findstr "LISTENING"') do (
        if not "%%a"=="" (
            wmic process where "ProcessId=%%a" get Name,ProcessId,CommandLine /format:table
        )
    )
) else (
    echo ✗ Servidor NO está corriendo en puerto %VITE_PORT%
)

echo.
echo Procesos Node.js activos:
tasklist | findstr "node.exe" >nul
if %errorlevel%==0 (
    tasklist | findstr "node.exe"
) else (
    echo   No hay procesos Node.js en ejecución
)

echo.
echo Procesos npm activos:
tasklist | findstr "npm.exe" >nul
if %errorlevel%==0 (
    tasklist | findstr "npm.exe"
) else (
    echo   No hay procesos npm en ejecución
)

echo.
echo Puertos de desarrollo en uso:
echo   Puerto    Estado    PID
echo   -------   -------   ---
for %%p in (3000 3001 3002 5173 5174 8080 8081) do (
    set "port_used=false"
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%%p " ^| findstr "LISTENING" 2^>nul') do (
        if not "%%a"=="" (
            echo   %%p        USADO     %%a
            set "port_used=true"
        )
    )
    if "!port_used!"=="false" (
        echo   %%p        LIBRE     -
    )
)

echo.
echo ===================================================
echo Comandos disponibles:
echo   start.bat      - Iniciar servidor
echo   stop.bat       - Detener servidor
echo   restart.bat    - Reiniciar con instalación completa
echo   kill-ports.bat - Forzar liberación de puertos
echo   status.bat     - Ver este estado (actual)
echo ===================================================
echo.
pause
