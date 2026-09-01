# Infraestructura local — entorno de desarrollo del prototipo A-Frame

## 1. Objetivo

Este documento describe la infraestructura que se armó para poder **correr y probar localmente** el
prototipo `xwill007/A-frame` (backend PHP + MySQL) en Mac, algo que el proyecto original no soportaba de
fábrica (fue desarrollado para Windows + XAMPP). No reemplaza al backend definitivo de `ApprendeVr`
(que se construye en NestJS — ver `integracion-aframe.md`, sección 7); es infraestructura de **referencia y
prueba** para poder ver funcionando las features (karaoke, evaluación, catálogo de canciones) mientras se
decide y ejecuta el puerto a React/NestJS.

## 2. Por qué hizo falta

El repo `A-frame` (clonado en `/Users/home/ARS-test/A-frame`, fuera del control de versiones de `ARS-test`)
trae:

- Un frontend estático (`english-vr/VR/index.html` + A-Frame) que se puede servir con cualquier servidor de
  archivos.
- Un backend en PHP + MySQLi (`Proyecto/backend/modelos/...`) que **sí necesita** un intérprete PHP y un
  servidor MySQL/MariaDB corriendo — sin esto, todo lo que depende de datos (login, lista de canciones,
  palabras/frases para evaluación, guardar resultados) falla.

Esta Mac no tenía PHP, MySQL ni Homebrew instalados. Se evaluaron tres caminos (Homebrew nativo, XAMPP para
Mac, Docker) y se eligió **Docker**, porque no requiere instalar nada persistente en el sistema operativo:
todo el stack vive en contenedores que se pueden apagar/borrar sin dejar rastro.

## 3. Qué se implementó

### 3.1 Estructura de archivos

```
A-frame/
  docker-dev/
    Dockerfile        # imagen PHP 8.2 + Apache + extensión mysqli + config de errores
    docker-compose.yml
    php-dev.ini        # config de PHP para no romper las respuestas JSON (ver 3.3)
    README.md          # instrucciones rápidas de uso
  Proyecto/backend/connDB.php   # editado: credenciales por variable de entorno (ver 3.2)
```

### 3.2 Servicios (`docker-compose.yml`)

| Servicio | Imagen | Rol | Puerto host |
|---|---|---|---|
| `db` | `mysql:8.0` | Base de datos `english_vr` | `3306` |
| `web` | build local (`php:8.2-apache` + `mysqli`) | Sirve el frontend estático **y** ejecuta el backend PHP | `8090` |

Puntos clave de la configuración:

- El servicio `web` monta **toda la carpeta `ARS-test/`** (dos niveles arriba de `docker-dev/`) como document
  root de Apache (`/var/www/html`). Esto es necesario porque el JS del frontend llama a los endpoints con
  rutas absolutas tipo `fetch('/A-frame/Proyecto/backend/modelos/.../algo.php')`, replicando la estructura
  `htdocs/A-frame/...` que tenía el XAMPP original. Si se sirviera solo la carpeta `A-frame/`, esas rutas
  absolutas no resolverían.
- `web` se conecta a `db` por nombre de servicio Docker (`DB_HOST=db`), no por `localhost` — dentro de la red
  interna de Docker cada servicio es un host propio.
- `db` expone `3306` al host **por comodidad** (para poder inspeccionar la base con un cliente MySQL desde
  fuera de Docker si hace falta), no porque el backend lo necesite — `web` habla con `db` por la red interna
  de Docker Compose, no por `localhost:3306`.

### 3.3 Fix de compatibilidad PHP 7 → PHP 8.2 (`php-dev.ini`)

El código de `Proyecto/backend` fue escrito para PHP 7.x. Corriéndolo en PHP 8.2 (la versión de la imagen
`php:8.2-apache`), ciertas funciones (`strpos()`, `mb_strtolower()`) reciben `null` donde antes se toleraba
silenciosamente, y PHP 8.2 emite un *warning* de tipo `Deprecated`. Con la configuración por defecto de PHP,
ese warning se imprime **dentro del cuerpo de la respuesta HTTP**, antes del JSON — el navegador recibe algo
como:

```
<br /><b>Deprecated</b>: strpos(): Passing null to parameter #1 ...
{"status":"success","words":[...]}
```

que ya no es JSON válido, y `fetch(...).then(r => r.json())` explota con `SyntaxError: Unexpected token`.
`php-dev.ini` desactiva `display_errors` (no se imprime nada en la respuesta) pero mantiene `log_errors = On`
(los errores se siguen viendo con `docker compose logs web`). Es una corrección de **configuración**, no se
tocó la lógica PHP original.

### 3.4 `connDB.php` — credenciales por entorno

Antes tenía host/usuario/clave/nombre de base hardcodeados (valores típicos de XAMPP: `localhost`, `root`,
sin clave). Ahora lee `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` de variables de entorno (`getenv(...)`), con
esos mismos valores como *fallback* si no están definidas. `docker-compose.yml` las inyecta en el servicio
`web`. Esto sigue la regla del proyecto de no hardcodear configuración/secretos, y de paso hace que el mismo
`connDB.php` siga funcionando igual si en algún momento se corre sobre XAMPP en vez de Docker (porque cae al
fallback).

## 4. Cómo se usa (día a día)

Ver también `A-frame/docker-dev/README.md`.

```bash
# Requiere Docker Desktop abierto y corriendo.
# El CLI de docker puede no estar en el PATH de una shell nueva en esta Mac:
export PATH="$HOME/.docker/bin:$PATH"

cd /Users/home/ARS-test/A-frame/docker-dev
docker compose up -d --build   # levanta db + web (primera vez: importa el schema, ver database.md)
```

Abrir: **http://localhost:8090/A-frame/english-vr/VR/index.html**

Apagar:

```bash
docker compose down       # detiene los contenedores, conserva los datos (volumen db-data)
docker compose down -v    # además borra el volumen: reset total de la base de datos
```

> Puerto **8090**, no 8080. El `8080` fue un `python3 -m http.server` usado antes de tener Docker, que solo
> servía archivos estáticos y devolvía los `.php` como texto plano en vez de ejecutarlos — ya se apagó y no
> debe volver a usarse para este proyecto.

## 5. Qué NO cubre esta infraestructura

- No es el backend de producción de `ApprendeVr` — ese se construye en NestJS (`integracion-aframe.md`,
  sección 7). Este entorno Docker es solo para poder ver funcionando el prototipo A-Frame mientras se porta.
- No tiene HTTPS ni ningún endurecimiento de seguridad — usuario `root` de MySQL sin contraseña, `display_errors`
  apagado solo para no romper JSON pero sin manejo de errores real. Uso exclusivamente local.
- No está pensado para exponerse fuera de `localhost`.

## 6. Ver también

- `integracion-aframe.md` — decisión de arquitectura y plan de puerto a React/NestJS.
- `database.md` — cómo crear, levantar y actualizar la base de datos en detalle.
