Users\will\Documents\GitHub\MY PROYECT\WilberVargas\ApprendeVr\front-r3f\generate-ssl.bat
@echo off
setlocal enabledelayedexpansion

:: IP a usar: la que venga por variable de entorno (VITE_FRONT_IP), o 192.168.1.11 por defecto
if not defined VITE_FRONT_IP set "VITE_FRONT_IP=192.168.1.11"

:: Create SSL directory if it doesn't exist
if not exist ssl mkdir ssl

:: Generate SSL certificates
"C:\Program Files\Git\usr\bin\openssl.exe" req -x509 -newkey rsa:4096 ^
  -keyout ssl/key.pem ^
  -out ssl/cert.pem ^
  -days 365 ^
  -nodes ^
  -subj "/C=CO/ST=Antioquia/L=Medellin/O=Development/CN=%VITE_FRONT_IP%" ^
  -addext "subjectAltName=IP:%VITE_FRONT_IP%,IP:127.0.0.1,DNS:localhost"

echo SSL certificates generated successfully (IP: %VITE_FRONT_IP%)