---
name: confirmar-antes-de-commit
description: Usar SIEMPRE antes de ejecutar git commit (o cualquier operación que publique cambios como git push, gh pr create). Exige autorización explícita e inequívoca del usuario en esa misma solicitud antes de commitear en este repo.
---

# Confirmar antes de hacer commit

En este repo (`ARS-test`, incluye `ApprendeVr` y `A-frame`) el usuario dejó explícito que
**commitear sin su autorización no es aceptable**. Este skill aplica sin importar qué tan
razonable parezca el commit, o cuánto trabajo se haya hecho antes.

## Regla

- Nunca ejecutar `git commit` (ni `git push`, ni crear un PR) solo porque el usuario respondió
  algo genérico como "ok", "dale", "si" o similar a un mensaje que **no preguntaba directamente**
  si había que commitear.
- Antes de commitear, hacer una pregunta directa e inequívoca — por ejemplo "¿confirmo el
  commit?" o "¿querés que lo commitee ahora?" — y esperar una respuesta que responda
  específicamente a esa pregunta ("sí, commiteá", "dale, commit", etc.).
- Si el usuario ya pidió explícitamente en el mismo mensaje "commitea esto" / "haz un commit" /
  equivalente, no hace falta volver a preguntar — eso ya es autorización directa.
- Una autorización de commit vale para ese commit puntual, no para futuros commits en la misma
  sesión. Cada commit necesita su propia autorización explícita.

## Idioma del mensaje de commit

- **Todo mensaje de commit se escribe en inglés**, incluidos el sujeto y el cuerpo, sin importar
  en qué idioma hable el usuario. El resto de la conversación puede ir en el idioma del usuario;
  solo el mensaje de commit va en inglés.
- El sujeto usa el prefijo de conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`,
  `chore:`, `test:`, `delete:`, `build:`, `ci:`, `perf:`, `style:`, `revert:`) y va en minúscula.
- Escribir un sujeto corto y descriptivo (≤ ~72 caracteres) y, si hace falta detalle, un cuerpo
  separado por una línea en blanco con bullets `- `.
- Usar imperativo presente ("add", "fix", "update", "remove"), no pasado ("added", "fixed").
- No incluir la referencia a la tarea/issue en el título a menos que el usuario lo pida.

## Por qué

El usuario ya tuvo que corregir esto una vez en este repo: se interpretó un "si" ambiguo (que
respondía a un resumen de cambios, no a una pregunta sobre commitear) como luz verde para
commitear, y no lo era. Esta skill existe para que cualquier agente de IA que trabaje en este
repo (Claude Code, opencode, o Copilot leyendo el prompt file asociado) aplique el mismo criterio,
no solo el que cometió el error original.
