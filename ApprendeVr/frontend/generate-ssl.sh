#!/bin/bash
set -e

# IP a usar: la que venga por variable de entorno, o la detectada automáticamente
IP="${VITE_FRONT_IP:-$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo 127.0.0.1)}"

# Crear directorio ssl si no existe
mkdir -p ssl

# Generar certificados SSL
openssl req -x509 -newkey rsa:4096 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -days 365 \
  -nodes \
  -subj "/C=CO/ST=Antioquia/L=Medellin/O=Development/CN=$IP" \
  -addext "subjectAltName=IP:$IP,IP:127.0.0.1,DNS:localhost"

echo "SSL certificates generated successfully (IP: $IP)"
