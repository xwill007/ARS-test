---
mode: agent
description: Crea un nuevo requerimiento de ApprendeVr en Documentation/Requerimientos/1-Pending siguiendo el template y la numeración correlativa del proyecto.
---

Este proyecto (`ApprendeVr`) define su procedimiento canónico para crear requerimientos en
`.agents/skills/crear-requerimiento/SKILL.md` (raíz del repo). Ese archivo es la fuente de verdad
— Claude Code y opencode lo leen vía symlink desde `.claude/skills/` y `.opencode/skills/` (raíz
del repo) respectivamente, así que no lo dupliques aquí.

Antes de hacer nada:

1. Lee `.agents/skills/crear-requerimiento/SKILL.md` completo.
2. Lee `ApprendeVr/Documentation/Requerimientos/README.md` para confirmar el flujo de estados
   vigente.
3. Sigue los pasos de esa skill al pie de la letra: calcular el siguiente número correlativo
   buscando en todas las carpetas de `Requerimientos/` (incluida `4-Rejected/Discarded`), pedir al
   usuario el tema si no está claro (no inventar alcance ni diseño técnico), y crear el archivo en
   `ApprendeVr/Documentation/Requerimientos/1-Pending/NNN-slug.md` con la estructura de 8 secciones
   que describe el template.

Si el contenido de `SKILL.md` cambia en el futuro, esas instrucciones actualizadas son las que
aplican, no lo que quedó resumido aquí.
