# Base de datos — `english_vr`

Guía de referencia para crear, levantar y actualizar la base de datos MySQL que usa el prototipo A-Frame
(`/Users/home/ARS-test/A-frame`) en el entorno Docker local descrito en `infraestructura-aframe-dev.md`.

## 1. Origen de los datos

| Archivo | Ruta | Rol |
|---|---|---|
| `english_vr.sql` | `A-frame/Proyecto/BaseDatos/english_vr.sql` | **Fuente principal.** Dump completo (schema + datos) exportado desde phpMyAdmin. Se ejecuta automáticamente al crear el contenedor de base de datos. |
| `migracion_nivel_evaluaciones_vr.sql` | `A-frame/Proyecto/BaseDatos/` | Migración puntual que agrega la columna `nivel` a `evaluaciones_vr`. **No hace falta correrla a mano**: `english_vr.sql` ya la incluye en su versión actual (dump post-migración). Solo sería necesaria si algún día se importa un `english_vr.sql` más viejo que no tenga esa columna. |
| `database.sql` | `A-frame/Proyecto/BaseDatos/` | Schema suelto (`FormularioRegistro`) de una iteración anterior del proyecto, no relacionado con `english_vr`. Se ignora. |

## 2. Esquema (tablas de `english_vr`)

| Tabla | Filas actuales | Contenido |
|---|---|---|
| `usuarios` | 14 | Cuentas de usuario (`id`, `name`, `email`, `password` hasheado, `level`) |
| `canciones_vr` | 3 | Catálogo de canciones (`id_cancion`, `titulo_cancion`, `autor_cancion`, `archivo_cancion`, `idioma_cancion`) |
| `frases_vr` | 125 | Frases en inglés/español por canción, con `tiempo_frase` para sincronizar con el video (Nivel 3 de evaluación) |
| `palabras_vr` | 824 | Palabras sueltas en inglés/español ligadas a una frase (Nivel 1 y 2 de evaluación) |
| `evaluaciones_vr` | 20 | Historial de evaluaciones: `id_cancion`, `id_usuario`, `total`, `nota_evaluacion`, `terminado`, `nivel` (1/2/3), `fecha_hora` |

Relaciones: `frases_vr.canciones_id_frase` → `canciones_vr.id_cancion`; `palabras_vr.id_frase_palabra` →
`frases_vr.id_frase`; `evaluaciones_vr.id_cancion`/`id_usuario` → `canciones_vr`/`usuarios`.

## 3. Crear la base de datos (primera vez)

No hace falta correr ningún script de SQL a mano. El contenedor `db` (imagen oficial `mysql:8.0`) está
configurado en `docker-compose.yml` para, **solo la primera vez que se crea su volumen**, ejecutar todo `.sql`
que encuentre montado en `/docker-entrypoint-initdb.d/`. `english_vr.sql` está montado ahí:

```yaml
services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ALLOW_EMPTY_PASSWORD: "yes"
      MYSQL_DATABASE: english_vr
    volumes:
      - ../Proyecto/BaseDatos/english_vr.sql:/docker-entrypoint-initdb.d/01-english_vr.sql:ro
      - db-data:/var/lib/mysql
```

Entonces, crear la base de datos es lo mismo que levantar el entorno:

```bash
export PATH="$HOME/.docker/bin:$PATH"   # ver infraestructura-aframe-dev.md, sección 4
cd /Users/home/ARS-test/A-frame/docker-dev
docker compose up -d --build
```

La primera vez tarda unos segundos extra mientras MySQL inicializa y corre el import. Se puede seguir el
progreso con:

```bash
docker compose logs -f db
```

hasta ver la línea `ready for connections`.

## 4. Levantar / apagar (uso normal, día a día)

```bash
cd /Users/home/ARS-test/A-frame/docker-dev

docker compose up -d      # levanta db + web reutilizando los datos ya importados
docker compose down       # apaga los contenedores, el volumen (los datos) se conserva
docker compose ps         # ver estado
docker compose logs -f db # ver logs de MySQL
```

Mientras el volumen `docker-dev_db-data` exista, los datos persisten entre `up`/`down` — el script de import
**no** se vuelve a correr (MySQL solo importa `/docker-entrypoint-initdb.d/` cuando el directorio de datos
está vacío).

## 5. Resetear la base de datos a los datos originales del dump

Para volver exactamente al estado de `english_vr.sql` (por ejemplo, si se ensució la data probando):

```bash
cd /Users/home/ARS-test/A-frame/docker-dev
docker compose down -v   # -v borra también el volumen db-data
docker compose up -d --build
```

## 6. Actualizar el esquema o los datos

Hay dos escenarios distintos:

### 6.1 Cambios chicos sobre una base ya levantada (agregar una canción, corregir una palabra, etc.)

Conectarse directamente al MySQL del contenedor y correr SQL ahí:

```bash
export PATH="$HOME/.docker/bin:$PATH"
docker compose exec -T db mysql -uroot english_vr -e "SELECT * FROM canciones_vr;"

# o de forma interactiva:
docker compose exec db mysql -uroot english_vr
```

También se puede usar cualquier cliente MySQL de escritorio (TablePlus, Sequel Ace, DBeaver, etc.) apuntando
a `localhost:3306`, usuario `root`, sin contraseña, base `english_vr` — el puerto está expuesto al host
justamente para esto (ver `infraestructura-aframe-dev.md`, 3.2).

Estos cambios viven en el volumen Docker, **no** en `english_vr.sql`. Si se hace `docker compose down -v`,
se pierden.

### 6.2 Cambios de esquema que deben persistir (nueva columna, nueva tabla)

1. Escribir el `ALTER TABLE` / `CREATE TABLE` en un archivo `.sql` nuevo dentro de
   `A-frame/Proyecto/BaseDatos/` (mismo patrón que `migracion_nivel_evaluaciones_vr.sql`), con un comentario
   explicando qué requerimiento lo motiva.
2. Aplicarlo a mano sobre el contenedor corriendo:
   ```bash
   docker compose exec -T db mysql -uroot english_vr < ../Proyecto/BaseDatos/mi_migracion.sql
   ```
3. Regenerar `english_vr.sql` (dump completo actualizado) para que una instalación nueva desde cero ya
   incluya el cambio, igual que se hizo con la columna `nivel`:
   ```bash
   docker compose exec db mysqldump -uroot --databases english_vr > ../Proyecto/BaseDatos/english_vr.sql
   ```
   (Este paso reemplaza el archivo local; si se quiere subir el cambio al repo `A-frame`, es una decisión
   del dueño de ese repo — acá solo se documenta el mecanismo local.)

### 6.3 Si el proyecto migra a NestJS/TypeORM (plan de `integracion-aframe.md`)

Cuando el backend Nest reemplace a los endpoints PHP, las migraciones de esquema deberían pasar a manejarse
con las migraciones de TypeORM (`typeorm migration:generate` / `migration:run`) en vez de archivos `.sql`
sueltos, apuntando a la misma base `english_vr` (o a su copia dentro de `ApprendeVr/backend`). Este documento
seguirá siendo válido como referencia del esquema original mientras dure la migración.

## 7. Credenciales (solo entorno local)

| Variable | Valor |
|---|---|
| Host (desde `web`) | `db` |
| Host (desde el Mac, ej. cliente MySQL de escritorio) | `localhost` / `127.0.0.1`, puerto `3306` |
| Usuario | `root` |
| Contraseña | *(vacía)* |
| Base de datos | `english_vr` |

Sin contraseña porque `MYSQL_ALLOW_EMPTY_PASSWORD=yes` está pensado solo para desarrollo local — no exponer
este contenedor fuera de `localhost`.
