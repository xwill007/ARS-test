export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASS ?? '',
    name: process.env.DB_NAME ?? 'english_vr',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  // Sin CORS_ORIGIN en .env, refleja el origin de la petición (cómodo en desarrollo local).
  corsOrigin: process.env.CORS_ORIGIN ?? true,
  // URL base del servicio LibreTranslate self-hosted (Requerimiento 015, traducción de letra).
  // Docker por defecto expone el puerto 5001 del host (ver docker-compose.yml, servicio
  // `translate`; macOS usa el 5000 para AirPlay, por eso se evitó).
  libreTranslateUrl: process.env.LIBRETRANSLATE_URL ?? 'http://localhost:5001',
});
