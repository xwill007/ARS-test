---
mode: agent
description: Mueve un requerimiento de ApprendeVr entre las carpetas de estado (1-Pending, 2-Developing, 3-Completed, 4-Rejected, 4-Rejected/Discarded, 5-Accepted) preservando su historial con git mv.
---

Este proyecto (`ApprendeVr`) define su procedimiento canónico para mover requerimientos entre
estados en `.agents/skills/promover-requerimiento/SKILL.md` (raíz del repo). Ese archivo es la
fuente de verdad — Claude Code y opencode lo leen vía symlink desde `ApprendeVr/.claude/skills/` y
`ApprendeVr/.opencode/skills/` respectivamente, así que no lo dupliques aquí.

Antes de hacer nada:

1. Lee `.agents/skills/promover-requerimiento/SKILL.md` completo.
2. Lee `ApprendeVr/Documentation/Requerimientos/README.md` para confirmar el flujo de estados
   vigente — **no es lineal**: desde `4-Rejected` solo se sale hacia `2-Developing` o
   `1-Pending`, nunca directo a `3-Completed` o `5-Accepted`.
3. Sigue los pasos de esa skill al pie de la letra: identificar el requerimiento, determinar la
   carpeta destino según lo que el usuario describe que pasó (no solo "la siguiente carpeta"),
   validar el checklist correspondiente antes de mover, anotar el motivo cuando se rechaza o
   descarta, y mover el archivo con `git mv` para conservar el historial.

Si el contenido de `SKILL.md` cambia en el futuro, esas instrucciones actualizadas son las que
aplican, no lo que quedó resumido aquí.
