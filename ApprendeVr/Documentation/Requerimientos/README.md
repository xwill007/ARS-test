# Flujo de estados de los Requerimientos

Este directorio organiza los requerimientos de `ApprendeVr` en carpetas que representan su
estado. Un requerimiento es una **carpeta** (con el número y slug en el nombre) que **se mueve de
carpeta de estado en carpeta de estado** a medida que avanza — nunca se duplica ni se reescribe su
número.

```
Requerimientos/
├── 1-Pending/            # Propuesto, aún no se empezó a desarrollar
├── 2-Developing/         # En desarrollo activo
├── 3-Completed/          # Desarrollo terminado, pendiente de validación
├── 4-Rejected/           # Presentó problemas en la validación — a reencolar
│   └── Discarded/        # Descartado definitivamente — estado final negativo
└── 5-Accepted/           # Validado y aceptado — estado final positivo
```

### Estructura interna de un requerimiento

Cada requerimiento es una **carpeta** `NNN-slug/` que contiene varios archivos Markdown, uno por
preocupación. Esto mantiene cada documento corto y navegable, y separa los ciclos de vida
(distintos) de cada pieza:

```
NNN-slug/
├── requerimiento.md        # Contrato: objetivo, antecedentes, alcance, diseño técnico,
│                           # archivos a modificar, criterios de aceptación, referencias.
├── checklist.md            # Checklist de ejecución por fases (lo que se marca al desarrollar).
├── problems_solutions.md   # Incidentes/problemas encontrados y cómo se resolvieron (crece con el tiempo).
└── tests.md                # Estrategia y casos de test del requerimiento.
```

| Archivo | Qué contiene | Cuándo se edita |
|---|---|---|
| `requerimiento.md` | Objetivo, antecedentes, alcance, diseño técnico, archivos a modificar, **criterios de aceptación**, referencias. | Al crearlo; se actualiza si cambia el alcance/diseño (p. ej. al reencolar desde `4-Rejected`). |
| `checklist.md` | Checklist de ejecución por fases. | Se marcan los items `- [x]` a medida que se desarrolla. |
| `problems_solutions.md` | Problemas/incidentes y su solución, con fecha. | Se agregan entradas cuando surge y se resuelve un problema. |
| `tests.md` | Estrategia de testing y casos de test (unitarios, integración, e2e). | Se define al planificar y se completa al verificar. |

La **carpeta completa** es lo que se mueve entre estados. El número y el slug **no cambian**;
solo cambia la carpeta de estado que la contiene.

## 1. Significado de cada carpeta

| Carpeta | Estado | Significa | Quién lo mueve |
|---|---|---|---|
| `1-Pending` | Pendiente | El requerimiento está escrito y definido (objetivo, alcance, diseño), pero nadie empezó a implementarlo. | Autor del requerimiento al crearlo, o quien reencola uno rechazado tras documentar la mejora. |
| `2-Developing` | En desarrollo | Alguien está trabajando activamente en la implementación descrita. | Quien toma la tarea, al empezar (desde `1-Pending` o al retomar uno desde `4-Rejected`). |
| `3-Completed` | Completado | La implementación terminó y el checklist de ejecución está marcado, pero todavía no fue validado contra los criterios de aceptación. | Quien termina la implementación. |
| `4-Rejected` | Rechazado / a reencolar | La validación encontró problemas: no cumple los criterios de aceptación tal como está, pero el requerimiento sigue siendo válido y se espera retomarlo. Es una cola de espera, no un estado final. | Quien valida y encuentra el problema. |
| `4-Rejected/Discarded` | Descartado | Se decidió no implementarlo (o no seguir implementándolo) y no se va a retomar. Estado final negativo — el archivo se queda ahí como registro histórico. | Quien decide descartarlo, desde cualquier estado activo (`1-Pending`, `2-Developing`, `3-Completed` o `4-Rejected`). |
| `5-Accepted` | Aceptado | Los criterios de aceptación (sección 6 del template) fueron verificados y confirmados. Estado final positivo; el archivo no se vuelve a mover. | Quien valida (autor original, QA, o el mismo dev si no hay otra revisión). |

Regla simple: **un requerimiento vive en una sola carpeta a la vez**, la que refleja su estado
actual. Para avanzarlo de estado se mueve el archivo (`git mv`) a la carpeta siguiente — el
contenido no se reescribe, salvo para marcar checkboxes ya completados o documentar la mejora
pendiente dentro del propio archivo.

## 2. El estado `4-Rejected` no es un callejón sin salida

A diferencia de `5-Accepted` y `4-Rejected/Discarded` (ambos finales), `4-Rejected` es una cola de
espera para requerimientos que necesitan más trabajo. Desde ahí solo hay dos caminos posibles:

- **→ `2-Developing`**, cuando se retoma el trabajo directamente sobre el requerimiento tal como
  está escrito (el problema encontrado no cambia el diseño ni el alcance, solo faltó terminarlo
  bien).
- **→ `1-Pending`**, cuando el problema encontrado sí implica un cambio: primero se documenta la
  mejora necesaria dentro del archivo (actualizar Alcance, Diseño técnico y/o Archivos a
  modificar), y recién entonces vuelve a la cola de pendientes para que alguien lo tome de nuevo.

Es decir: **nunca se mueve un requerimiento de `4-Rejected` directamente a `3-Completed` o
`5-Accepted`** — siempre pasa de nuevo por desarrollo (`2-Developing`) o por la cola (`1-Pending`)
antes de poder volver a intentar la validación.

Si el problema encontrado es lo bastante grave como para que no valga la pena retomarlo, se mueve
en cambio a `4-Rejected/Discarded`, no se deja en la cola de `4-Rejected`.

## 3. Convención de nombres y numeración

- Formato de carpeta: `NNN-slug-en-minusculas-con-guiones/`, por ejemplo
  `001-fix-fuente-msdf-negate/`.
- `NNN` es un correlativo de 3 dígitos **único y global** para todo el proyecto — no se reinicia
  por carpeta ni al pasar por `4-Rejected` o `4-Rejected/Discarded`. El siguiente número a usar es
  `(el número más alto encontrado en cualquiera de las carpetas, incluida `Discarded`) + 1`.
- El número y el nombre de la carpeta **no cambian** al moverla entre estados; solo cambia su
  ubicación.
- Para ubicar el número más alto se busca en los nombres de carpeta y de archivo (conviven ambos
  formatos durante la migración):
  ```
  find ApprendeVr/Documentation/Requerimientos -type d -name '[0-9][0-9][0-9]-*' \
    -exec basename {} \; | sort -n | tail -1
  find ApprendeVr/Documentation/Requerimientos -name '[0-9][0-9][0-9]-*.md' \
    -exec basename {} \; | sed 's/\.md$//' | sort -n | tail -1
  ```
  (Usar el mayor de ambos resultados.)

## 4. Template de contenido

Todo requerimiento nuevo es una **carpeta** `NNN-slug/` con los cuatro archivos de la tabla de
arriba. La distribución del template clásico queda así:

### `requerimiento.md`

1. **Objetivo** — qué problema resuelve o qué feature agrega, en 1-2 párrafos.
2. **Antecedentes y estado actual** — contexto necesario para entender el porqué.
3. **Historias de usuario** — casos de uso en formato "Como [rol], quiero [acción], para [beneficio]".
   Redactadas en términos del **valor funcional** para quien usa la app (no de implementación). Cada
   historia se escribe como una frase única y concreta, con criterios de aceptación claros cuando
   aporten. Sirven de puente entre el objetivo y los criterios de aceptación técnicos de la
   sección 6.
4. **Alcance** — qué incluye y qué explícitamente no incluye (subsecciones `Incluido` / `No incluido`).
5. **Diseño técnico** — opciones consideradas y decisión tomada.
6. **Archivos a modificar** — tabla archivo → cambio.
7. **Criterios de aceptación** — checklist verificable; es lo que se revisa para mover el
   requerimiento de `3-Completed` a `5-Accepted` (o a `4-Rejected` si no se cumple).
8. **Referencias** — enlaces o commits relacionados.

> **Regla de historias de usuario:** van **antes** del diseño técnico y **en lenguaje de negocio**,
> sin mencionar archivos, hooks ni librerías. Ejemplo correcto: *"Como estudiante, quiero dictar mi
> nombre con la voz en el formulario de registro, para no tener que teclearlo."* Ejemplo incorrecto
> (técnico): *"Como dev, quiero usar useVoiceControl para llenar el input."*

### `checklist.md`

El **checklist de ejecución** por fases (es lo que se marca para mover el requerimiento de
`2-Developing` a `3-Completed`).

### `problems_solutions.md`

Registro de incidentes: fecha, problema, causa y solución. Empieza con un encabezado y va creciendo.

**Regla de registro de hallazgos tardíos:** cuando un item del `checklist.md` o un criterio de
aceptación ya está marcado como `[x]` pero después se descubre —por el agente, por el usuario o por
una herramienta de validación— que no estaba realmente resuelto, es obligatorio (sin esperar a que
el usuario lo pida): corregir la marca si corresponde y registrar el hallazgo en este archivo
indicando que fue un **hallazgo tardío**. Ver skill `crear-requerimiento`.

### `tests.md`

Estrategia de testing y tabla de casos (unitarios, integración, e2e) con su estado.

Cuando un requerimiento pasa por `4-Rejected` rumbo a `1-Pending`, se agrega además una nota breve
(por ejemplo al final de "Antecedentes y estado actual" en `requerimiento.md`) explicando qué
problema se encontró en la validación y qué mejora quedó documentada para el próximo intento.

## 5. Automatización multi-IA (Claude Code, opencode, Copilot)

Este flujo tiene skills que automatizan crear y mover requerimientos, compartidas entre las
herramientas de IA usadas en este repo:

- **Fuente única de verdad:** `.agents/skills/{crear-requerimiento,promover-requerimiento,confirmar-antes-de-commit}/SKILL.md`,
  en la raíz del repo — nombre neutral, no atado a ningún vendor en particular.
- **Claude Code:** `.claude/skills` (raíz del repo) es un symlink a `../.agents/skills`.
- **opencode:** `.opencode/skills` (raíz del repo) es un symlink a `../.agents/skills`. Ambos
  symlinks apuntan al mismo `SKILL.md` real — mismo formato exacto para ambas herramientas, cero
  duplicación. Requiere `git config core.symlinks true` al clonar en sistemas donde los symlinks
  no estén habilitados por defecto (típicamente Windows).
  `.claude/` y `.opencode/` viven en la raíz del repo (no dentro de `ApprendeVr/`) porque ambas
  herramientas buscan esas carpetas como hermanas del directorio desde el que se invocan, no
  dentro de subcarpetas anidadas — no pueden vivir dentro de `.agents/` ni de `ApprendeVr/`.
- **GitHub Copilot** no tiene un formato de "skill" propio; su equivalente son *prompt files* en
  `.github/prompts/` (a nivel raíz del repo, por convención de GitHub). `crear-requerimiento.prompt.md`
  y `promover-requerimiento.prompt.md` ahí son punteros delgados que le indican a Copilot que lea y
  siga el `SKILL.md` correspondiente en `.agents/skills/` — no repiten el contenido, para que no
  queden desincronizados si el `SKILL.md` cambia.

Si se agrega o edita una skill, el único archivo que hay que tocar es el `SKILL.md` en
`.agents/skills/` — Claude Code y opencode lo reciben automáticamente por symlink, y Copilot lo lee
al vuelo por la referencia en su prompt file.

## 6. Migración de requerimientos existentes

Los requerimientos `001`–`005` fueron migrados del formato viejo (un único archivo `NNN-slug.md`)
al formato nuevo (carpeta `NNN-slug/` con `requerimiento.md`, `checklist.md`,
`problems_solutions.md`, `tests.md`). El contenido se conservó: el cuerpo del requerimiento quedó en
`requerimiento.md` (secciones 1–6 + Referencias) y el checklist de ejecución se movió a
`checklist.md`. `problems_solutions.md` y `tests.md` arrancan como plantillas a completar.

El historial se preservó con `git mv` (el rename se ve en git como archivo movido, no borrado).
A partir de ahora, **todos** los requerimientos nuevos se crean directamente como carpeta
(skill `crear-requerimiento`).
