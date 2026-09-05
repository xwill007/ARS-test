#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Levantar Docker Desktop (si no está corriendo) y los contenedores necesarios del backend
# (MySQL con la base english_vr) antes de arrancar el frontend.
echo "Verificando Docker..."
if ! docker info >/dev/null 2>&1; then
  echo "Docker no está corriendo, iniciando Docker Desktop..."
  open -a Docker
  attempts=0
  until docker info >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 40 ]; then
      echo "Docker no arrancó luego de 2 minutos. Ábrelo manualmente y vuelve a correr este script."
      exit 1
    fi
    sleep 3
  done
fi

echo "Levantando contenedores del backend (MySQL)..."
(cd "$SCRIPT_DIR/../ApprendeVr/backend" && docker compose up -d)

echo "Navegando al directorio del proyecto..."
cd "$SCRIPT_DIR/../ApprendeVr/frontend"

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
