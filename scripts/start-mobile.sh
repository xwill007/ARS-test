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

# Iniciar el backend (NestJS) en segundo plano. El frontend le pega vía el proxy /api de Vite
# (ver vite.config.js), así que tiene que estar arriba antes de que alguien intente loguearse.
echo "Iniciando backend (NestJS)..."
(cd "$SCRIPT_DIR/../ApprendeVr/backend" && npm run start:dev) &
BACKEND_PID=$!

# Túnel público (cloudflared) con certificado real, para acceso móvil sin advertencia de
# certificado autofirmado (ver Requerimiento 012, problems_solutions.md fila 2026-09-08:
# el certificado autofirmado de ssl/cert.pem no siempre basta para que fetch() funcione
# en navegadores móviles reales). IMPORTANTE: iniciar sesión desde la URL del túnel — la
# sesión guardada en localStorage es por origen, no se comparte con la IP LAN.
TUNNEL_LOG="$(mktemp)"
TUNNEL_PID=""
if command -v cloudflared >/dev/null 2>&1; then
  echo "Iniciando túnel cloudflared..."
  cloudflared tunnel --url "https://$VITE_FRONT_IP:$VITE_PORT" --no-tls-verify >"$TUNNEL_LOG" 2>&1 &
  TUNNEL_PID=$!
else
  echo "cloudflared no está instalado (brew install cloudflared) — se omite el túnel público."
fi

cleanup() {
  echo "Deteniendo backend..."
  kill "$BACKEND_PID" 2>/dev/null
  if [ -n "$TUNNEL_PID" ]; then
    echo "Deteniendo túnel..."
    kill "$TUNNEL_PID" 2>/dev/null
  fi
  rm -f "$TUNNEL_LOG"
}
trap cleanup EXIT

# Esperar a que cloudflared publique la URL pública del túnel (aparece en su log)
TUNNEL_URL=""
if [ -n "$TUNNEL_PID" ]; then
  attempts=0
  until [ -n "$TUNNEL_URL" ] || [ "$attempts" -ge 20 ]; do
    TUNNEL_URL="$(grep -o 'https://[a-zA-Z0-9.-]*\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | head -n1)"
    [ -n "$TUNNEL_URL" ] && break
    attempts=$((attempts + 1))
    sleep 1
  done
fi

echo ""
echo "=== Acceso móvil ==="
echo "  ➜  Red local (misma WiFi):  https://$VITE_FRONT_IP:$VITE_PORT/"
if [ -n "$TUNNEL_URL" ]; then
  echo "  ➜  Túnel público (cualquier red):  $TUNNEL_URL/"
else
  echo "  ➜  Túnel público: no disponible (revisa $TUNNEL_LOG)"
fi
echo "IMPORTANTE: inicia sesión desde la URL que vayas a usar en el celular (la sesión no se comparte entre orígenes distintos)."
echo "====================="
echo ""

# Iniciar el servidor
if [ -n "$TUNNEL_URL" ]; then
  echo "Starting server — red pública: $TUNNEL_URL"
else
  echo "Starting server at https://$VITE_FRONT_IP:$VITE_PORT"
fi
npx vite --host "$VITE_FRONT_IP" --port "$VITE_PORT"
