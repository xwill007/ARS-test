#!/bin/sh
set -e

# Si no existen los certificados, los generamos
if [ ! -f "/etc/nginx/ssl/key.pem" ] || [ ! -f "/etc/nginx/ssl/cert.pem" ]; then
    echo "Generando certificados SSL auto-firmados..."
    
    # Crear directorio si no existe
    mkdir -p /etc/nginx/ssl
    
    # Generar certificado auto-firmado
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/key.pem \
        -out /etc/nginx/ssl/cert.pem \
        -subj "/CN=${FRONT_IP}" \
        -addext "subjectAltName=IP:${FRONT_IP}"
    
    # Asegurar permisos correctos
    chmod 644 /etc/nginx/ssl/*
    
    echo "Certificados generados exitosamente en /etc/nginx/ssl/"
fi

# Ejecutar el comando original de nginx (si existe)
if [ "$1" = "nginx" ]; then
    exec "$@"
fi