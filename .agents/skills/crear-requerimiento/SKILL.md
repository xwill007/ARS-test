---
name: crear-requerimiento
description: Crea un nuevo requerimiento de ApprendeVr en Documentation/Requerimientos/1-pending siguiendo el template y la numeración correlativa del proyecto. Usar cuando el usuario pida crear/redactar un nuevo requerimiento, feature, bug o cambio para documentar antes de implementarlo.
---

# Crear un nuevo requerimiento

Este skill crea un requerimiento nuevo en `ApprendeVr/Documentation/Requerimientos/1-Pending/`,
siguiendo la convención documentada en `ApprendeVr/Documentation/Requerimientos/README.md`.

Un requerimiento es una **carpeta** `NNN-slug/` con cuatro archivos Markdown, uno por
preocupación:

```
1-Pending/NNN-slug/
├── requerimiento.md        # objetivo, alcance, diseño técnico, archivos, criterios de aceptación
├── checklist.md            # checklist de ejecución por fases
├── problems_solutions.md   # incidentes/problemas y soluciones (crece con el tiempo)
└── tests.md                # estrategia y casos de test
```

## Pasos

1. **Leer el README del flujo** en `ApprendeVr/Documentation/Requerimientos/README.md` si no lo
   tienes ya en contexto, para confirmar la convención vigente (puede cambiar con el tiempo).

2. **Reunir el tema del requerimiento.** Si el usuario no dio un título/objetivo claro y
   suficiente detalle para redactar el documento (qué problema resuelve, qué toca, qué NO toca),
   pregúntale antes de inventar contenido. No fabriques alcance, diseño técnico ni archivos a
   modificar que no puedas fundamentar en el código real o en lo que el usuario indicó.

3. **Calcular el siguiente número correlativo.** Buscar el número más alto usado en cualquiera de
   las carpetas de estado, incluida `4-Rejected/Discarded`. El número puede estar en una carpeta
   (formato nuevo) o en un archivo (formato viejo, en migración):
   ```
   find ApprendeVr/Documentation/Requerimientos -type d -name '[0-9][0-9][0-9]-*' \
     -exec basename {} \; | sort -n | tail -1
   find ApprendeVr/Documentation/Requerimientos -name '[0-9][0-9][0-9]-*.md' \
     -exec basename {} \; | sed 's/\.md$//' | sort -n | tail -1
   ```
   El nuevo requerimiento usa el mayor de ambos resultados + 1, con padding de 3 dígitos (`NNN`).

4. **Elegir el slug.** Título corto en minúsculas, en español, separado por guiones, sin acentos
   ni caracteres especiales (ej. `agregar-modo-offline`).

5. **Crear la carpeta** `ApprendeVr/Documentation/Requerimientos/1-Pending/NNN-slug/` y dentro los
   cuatro archivos:

   - **`requerimiento.md`** con esta estructura (ver `5-Accepted/001-fix-fuente-msdf-negate.md`
     como referencia extensa del formato viejo):
     1. `# Requerimiento NNN — Título`
     2. `## 1. Objetivo`
     3. `## 2. Antecedentes y estado actual`
     4. `## 3. Alcance` (subsecciones `### Incluido` / `### No incluido`)
     5. `## 4. Diseño técnico` (opciones consideradas + decisión)
     6. `## 5. Archivos a modificar` (tabla)
     7. `## 6. Criterios de aceptación` (checklist `- [ ]`)
     8. `## 7. Referencias`
   - **`checklist.md`** con el `## Checklist de ejecución` por fases (`- [ ]`).
   - **`problems_solutions.md`** con un encabezado y una entrada inicial "Sin incidentes
     registrados" (se irá llenando).
   - **`tests.md`** con la estrategia de testing y tabla de casos (unitarios/integración/e2e).

   Cada sección debe basarse en investigación real del código (usa Grep/Read/Explore para
   confirmar rutas de archivo, líneas y comportamiento actual) — no completar secciones con
   contenido genérico o inventado.

6. **Confirmar el resultado al usuario**: ruta de la carpeta creada, número asignado, y un resumen
   de 1-2 líneas del objetivo. No la muevas de `1-Pending` — ese es siempre el estado inicial,
   salvo que este requerimiento sea el resultado de reencolar uno rechazado (ver skill
   `promover-requerimiento`), en cuyo caso quien reencola es quien lo mueve, no quien lo crea.
