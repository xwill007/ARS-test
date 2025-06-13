# Etapa de construcción
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Construir la aplicación
RUN npm run build

# Etapa de producción
FROM nginx:alpine
# Copiar los archivos construidos
COPY --from=builder /app/dist /usr/share/nginx/html
# Copiar la configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Exponer el puerto 80
EXPOSE 80