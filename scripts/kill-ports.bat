@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0..\"

echo ===================================================
echo        LIBERACIÓN FORZADA DE PUERTOS
echo ===================================================
echo.
echo ADVERTENCIA: Este script matará TODOS los procesos
echo que estén usando los puertos de desarrollo.
echo.

set /p confirm="¿Continuar? (S/N): "
if /i not "%confirm%"=="S" if /i not "%confirm%"=="s" (
    echo Operación cancelada.
    pause
    exit /b
)

:: Cargar configuración desde .env
if exist ".env" (
    for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
        set "line=%%a"
        if not "!line:~0,1!"=="#" if not "!line!"=="" (
            set "%%a=%%b"
        )
    )
) else (
    set "VITE_PORT=3000"
)

echo.
echo Forzando liberación de puertos...

:: Lista de puertos comunes de desarrollo
set "ports=3000 3001 3002 5173 5174 8080 8081 4173 4174"
if defined VITE_PORT (
    set "ports=%VITE_PORT% %ports%"
)

for %%p in (%ports%) do (
    echo.
    echo Verificando puerto %%p...
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%%p " ^| findstr "LISTENING" 2^>nul') do (
        if not "%%a"=="" (
            echo    Matando proceso PID %%a en puerto %%p
            taskkill /F /PID %%a >nul 2>&1
            if %errorlevel%==0 (
                echo    ✓ Proceso %%a terminado
            ) else (
                echo    ✗ No se pudo terminar proceso %%a
            )
        )
    )
)

:: Matar procesos específicos por nombre
echo.
echo Terminando procesos por nombre...
for %%proc in (node.exe npm.exe vite.exe) do (
    echo Terminando %%proc...
    taskkill /F /IM %%proc >nul 2>&1
    if %errorlevel%==0 (
        echo    ✓ %%proc terminado
    )
)

:: Mostrar puertos que siguen ocupados
echo.
echo Verificando puertos restantes...
for %%p in (%ports%) do (
    netstat -aon | findstr ":%%p " | findstr "LISTENING" >nul 2>&1
    if %errorlevel%==0 (
        echo    ⚠ Puerto %%p aún en uso:
        netstat -aon | findstr ":%%p " | findstr "LISTENING"
    ) else (
        echo    ✓ Puerto %%p libre
    )
)

echo.
echo ===================================================
echo Operación completada.
echo Si algún puerto sigue ocupado, es posible que
echo necesites reiniciar el sistema.
echo ===================================================
pause
