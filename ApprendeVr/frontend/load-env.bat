@echo off
setlocal enabledelayedexpansion

:: Función para leer variables del archivo .env
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
    set "DEFAULT_BROWSER=chrome"
    set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
    set "FIREFOX_PATH=C:\Program Files\Mozilla Firefox\firefox.exe"
    set "EDGE_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
)

:: Función para obtener la ruta del navegador
set "BROWSER_PATH="
if /i "%DEFAULT_BROWSER%"=="chrome" set "BROWSER_PATH=%CHROME_PATH%"
if /i "%DEFAULT_BROWSER%"=="firefox" set "BROWSER_PATH=%FIREFOX_PATH%"
if /i "%DEFAULT_BROWSER%"=="edge" set "BROWSER_PATH=%EDGE_PATH%"
if /i "%DEFAULT_BROWSER%"=="msedge" set "BROWSER_PATH=%EDGE_PATH%"

:: Verificar si el navegador existe
if not exist "%BROWSER_PATH%" (
    echo Advertencia: No se encontró el navegador en "%BROWSER_PATH%"
    echo Buscando navegadores alternativos...
    
    if exist "%CHROME_PATH%" (
        set "BROWSER_PATH=%CHROME_PATH%"
        echo Usando Chrome: %CHROME_PATH%
    ) else if exist "%FIREFOX_PATH%" (
        set "BROWSER_PATH=%FIREFOX_PATH%"
        echo Usando Firefox: %FIREFOX_PATH%
    ) else if exist "%EDGE_PATH%" (
        set "BROWSER_PATH=%EDGE_PATH%"
        echo Usando Edge: %EDGE_PATH%
    ) else (
        echo No se encontró ningún navegador. La aplicación se iniciará sin abrir navegador.
        set "BROWSER_PATH="
    )
)

goto :eof
