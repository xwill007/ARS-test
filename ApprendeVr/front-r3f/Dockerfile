# Etapa de construcción
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Etapa de producción
FROM node:18-alpine
WORKDIR /app

# Instalar Vite globalmente
RUN npm install -g vite

# Copiar solo lo necesario
COPY --from=builder /app/package*.json ./
RUN npm install --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Usar el comando de Vite directamente
CMD ["vite", "preview", "--host", "0.0.0.0", "--port", "3000"]