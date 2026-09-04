---
name: crear-rama-git
description: Crea una nueva rama de git en ARS-test siguiendo la convención de numeración correlativa (NN-will-descripcion), verificando siempre el índice más alto de las ramas existentes antes de crear la nueva. Usar cuando el usuario pida crear una rama para una nueva feature, fix o tarea.
---

# Crear una nueva rama de git

Este skill crea una rama nueva en `ARS-test` siguiendo la convención de nombres con índice
correlativo global que usa el proyecto.

## Convención de nombres

- Formato: `NN-will-<descripcion-en-minusculas-con-guiones>` (sin acentos ni caracteres especiales).
  Ejemplos reales del repo: `26-will-video-r3f`, `27-will-voice-control`, `28-will-cone-words-aframe`,
  `30-will-inicio`.
- `NN` es un correlativo **global y único** para todas las ramas del repo — no se reinicia por
  tipo de trabajo. La siguiente rama usa `(el índice más alto encontrado) + 1`.
- Las ramas de documentación/infraestructura (ej. `docs/aframe-integration-infra`) y las de
  mantenimiento (`main`) **no** llevan índice; solo las ramas de feature/fix/tarea del flujo
  `NN-will-*`.

## Pasos

1. **Verificar el índice más alto** entre todas las ramas remotas y locales:
   ```bash
   git fetch --all --prune
   git branch -a | grep -oE '[0-9]+-[a-zA-Z]' | grep -oE '^[0-9]+' | sort -n | tail -1
   ```
   El comando extrae los números de las ramas `NN-will-*` (local + remote) y devuelve el mayor.
   Si no hay ninguna rama indexada, se empieza en `1`.

2. **Confirmar la numeración con el usuario** si el número obtenido no coincide con lo esperado
   o si hay ramas con el mismo índice en dos formatos (p. ej. `#17-...` y `17-...`) — elegir el
   mayor sin ambigüedad y mencionarlo.

3. **Elegir el slug** de la descripción, en minúsculas y con guiones, en español o inglés según
   lo que pida el usuario (ej. `backend`, `backend-integration`, `fix-overlay-mirror`).

4. **Elegir la rama base.** Por defecto, crear desde `main` salvo que el trabajo dependa de otra
   rama aún no fusionada; en ese caso crear desde esa rama y decirlo explícitamente. Verificar
   primero que el working tree esté limpio (`git status`).

5. **Crear y cambiar a la rama**:
   ```bash
   git checkout -b NN-will-<slug>
   ```
   (o `git switch -c`). No se hace `git push` automáticamente; solo cuando el usuario lo pida.

6. **Confirmar al usuario**: nombre de la rama creada, índice asignado (indicando el anterior),
   rama base de la que se partió, y estado actual (`git rev-parse --abbrev-ref HEAD`).

## Reglas

- **Nunca** inventar el índice sin verificar: siempre leerlo con el comando del paso 1.
- El índice no se reutiliza ni se "repara"; si una rama fue borrada, su número no se reasigna.
- No commitear como parte de crear la rama; este skill solo crea y cambia de rama.
- El nombre de la rama no cambia después de crearla; si se eligió mal, se borra la rama y se
  crea otra (con su propio índice).
