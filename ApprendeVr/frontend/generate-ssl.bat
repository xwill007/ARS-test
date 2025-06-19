Users\will\Documents\GitHub\MY PROYECT\WilberVargas\ApprendeVr\front-r3f\generate-ssl.bat
@echo off
setlocal enabledelayedexpansion

:: Create SSL directory if it doesn't exist
if not exist ssl mkdir ssl

:: Generate SSL certificates
"C:\Program Files\Git\usr\bin\openssl.exe" req -x509 -newkey rsa:4096 ^
  -keyout ssl/key.pem ^
  -out ssl/cert.pem ^
  -days 365 ^
  -nodes ^
  -subj "/C=CO/ST=Antioquia/L=Medellin/O=Development/CN=192.168.1.11" ^
  -addext "subjectAltName=IP:192.168.1.11,IP:127.0.0.1,DNS:localhost"

echo SSL certificates generated successfully