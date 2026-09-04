#!/bin/bash
set -e

echo "Navegando al directorio del proyecto..."
cd "$(dirname "$0")/../ApprendeVr/frontend"

# Detectar la IP local automáticamente (Wi-Fi en0, o Ethernet en1 como respaldo)
DETECTED_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo 127.0.0.1)"

# Variables de entorno
export VITE_FRONT_IP="${VITE_FRONT_IP:-$DETECTED_IP}"
export VITE_PORT="3000"
export VITE_HTTPS="true"

# Matar procesos de Node en ejecución
killall -9 node 2>/dev/null || true

# Generar certificados SSL
bash generate-ssl.sh

# Iniciar el servidor
echo "Starting server at https://$VITE_FRONT_IP:$VITE_PORT"
npx vite --host "$VITE_FRONT_IP" --port "$VITE_PORT"
