@echo off
setlocal enabledelayedexpansion

:menu
cls
echo ===================================================
echo          GESTOR DEL SERVIDOR VR - ARS
echo ===================================================
echo.
echo 1. Iniciar servidor (inicio rápido)
echo 2. Reiniciar servidor (instalación completa)
echo 3. Detener servidor
echo 4. Ver estado del servidor
echo 5. Liberar puertos forzadamente
echo 6. Limpiar caché y dependencias
echo 7. Configurar .env
echo 8. Ver logs de errores
echo 9. Salir
echo.
echo ===================================================

set /p option="Selecciona una opción (1-9): "

if "%option%"=="1" goto start_server
if "%option%"=="2" goto restart_server
if "%option%"=="3" goto stop_server
if "%option%"=="4" goto status_server
if "%option%"=="5" goto kill_ports
if "%option%"=="6" goto clean_cache
if "%option%"=="7" goto configure_env
if "%option%"=="8" goto show_logs
if "%option%"=="9" goto exit_menu

echo Opción no válida. Intenta de nuevo.
timeout /t 2 >nul
goto menu

:start_server
echo.
echo Iniciando servidor...
call "%~dp0start.bat" --no-pause
echo.
echo Presiona cualquier tecla para volver al menú...
pause >nul
goto menu

:restart_server
echo.
echo Reiniciando servidor con instalación completa...
call "%~dp0restart.bat" --no-pause
echo.
echo Presiona cualquier tecla para volver al menú...
pause >nul
goto menu

:stop_server
echo.
echo Deteniendo servidor...
call "%~dp0stop.bat" --no-pause
echo.
echo Presiona cualquier tecla para volver al menú...
pause >nul
goto menu

:status_server
echo.
echo Verificando estado del servidor...
call "%~dp0status.bat"
echo.
echo Presiona cualquier tecla para volver al menú...
pause >nul
goto menu

:kill_ports
echo.
echo Liberando puertos forzadamente...
call "%~dp0kill-ports.bat"
echo.
echo Presiona cualquier tecla para volver al menú...
pause >nul
goto menu

:clean_cache
echo.
echo Limpiando caché y dependencias...
cd /d "%~dp0..\ApprendeVr\frontend"
echo Limpiando caché de npm...
npm cache clean --force
echo Eliminando node_modules...
if exist node_modules rmdir /s /q node_modules
echo Eliminando package-lock.json...
if exist package-lock.json del package-lock.json
echo.
echo Caché limpiado. Usa la opción 2 para reinstalar.
echo.
echo Presiona cualquier tecla para volver al menú...
pause >nul
goto menu

:configure_env
echo.
echo Abriendo archivo .env para edición...
if exist "%~dp0..\.env" (
    notepad.exe "%~dp0..\.env"
) else (
    echo Archivo .env no encontrado. Creando uno nuevo...
    copy "%~dp0..\.env.example" "%~dp0..\.env" 2>nul
    if exist "%~dp0..\.env" (
        notepad.exe "%~dp0..\.env"
    ) else (
        echo No se pudo crear el archivo .env
    )
)
echo.
echo Presiona cualquier tecla para volver al menú...
pause >nul
goto menu

:show_logs
echo.
echo Mostrando logs de npm...
cd /d "%~dp0..\ApprendeVr\frontend"
if exist "npm-debug.log" (
    type npm-debug.log
) else if exist ".npm/_logs" (
    dir /od ".npm\_logs" | tail -1
) else (
    echo No se encontraron logs de errores recientes.
    echo.
    echo Ubicaciones típicas de logs:
    echo - %APPDATA%\npm-cache\_logs\
    echo - %USERPROFILE%\.npm\_logs\
)
echo.
echo Presiona cualquier tecla para volver al menú...
pause >nul
goto menu

:exit_menu
echo.
echo ¡Hasta luego!
exit /b

:eof
