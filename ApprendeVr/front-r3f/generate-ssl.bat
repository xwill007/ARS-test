@echo off
mkdir ssl 2>nul
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/C=CO/ST=Antioquia/L=Medellin/O=Desarrollo/CN=localhost"
echo Certificados generados en la carpeta ssl/