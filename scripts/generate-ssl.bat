@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0..\ApprendeVr\frontend"

:: Create SSL directory if it doesn't exist
if not exist ssl mkdir ssl

if not defined VITE_FRONT_IP set "VITE_FRONT_IP=localhost"

set "OPENSSL=C:\Program Files\Git\usr\bin\openssl.exe"
set "VITE_SSL_SAN=IP:127.0.0.1,DNS:localhost"
if /i not "%VITE_FRONT_IP%"=="localhost" set "VITE_SSL_SAN=%VITE_SSL_SAN%,IP:%VITE_FRONT_IP%"

if not exist ssl\ca.key (
  "%OPENSSL%" req -x509 -newkey rsa:4096 ^
    -keyout ssl/ca.key ^
    -out ssl/ca.pem ^
    -days 3650 ^
    -nodes ^
    -subj "/C=CO/ST=Antioquia/L=Medellin/O=Development/CN=ARS Local Dev CA"
)

if not exist ssl\ca.pem (
  echo ERROR: No se pudo crear la CA local.
  exit /b 1
)

if not exist ssl\ca.key (
  echo ERROR: No se pudo crear la clave de la CA local.
  exit /b 1
)

if exist ssl\server.csr del /f /q ssl\server.csr
if exist ssl\server-ext.cnf del /f /q ssl\server-ext.cnf

(
  echo [v3_req]
  echo subjectAltName=%VITE_SSL_SAN%
  echo extendedKeyUsage=serverAuth
  echo keyUsage=digitalSignature,keyEncipherment
) > ssl\server-ext.cnf

:: Generate server certificate signed by the local CA
"%OPENSSL%" req -new -newkey rsa:4096 ^
  -keyout ssl/key.pem ^
  -out ssl/server.csr ^
  -nodes ^
  -subj "/C=CO/ST=Antioquia/L=Medellin/O=Development/CN=%VITE_FRONT_IP%"

"%OPENSSL%" x509 -req ^
  -in ssl/server.csr ^
  -CA ssl/ca.pem ^
  -CAkey ssl/ca.key ^
  -CAcreateserial ^
  -out ssl/cert.pem ^
  -days 825 ^
  -sha256 ^
  -extfile ssl/server-ext.cnf ^
  -extensions v3_req

if exist ssl\server.csr del /f /q ssl\server.csr
if exist ssl\server-ext.cnf del /f /q ssl\server-ext.cnf

if not exist public mkdir public
copy /Y ssl\ca.pem public\ca.crt >nul

if not exist public\ca.crt (
  echo ERROR: No se pudo publicar public\ca.crt para descarga en el movil.
  exit /b 1
)

echo SSL certificates generated successfully