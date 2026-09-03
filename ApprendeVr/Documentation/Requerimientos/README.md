# Flujo de estados de los Requerimientos

Este directorio organiza los requerimientos de `ApprendeVr` en carpetas que representan su
estado. Un requerimiento es un único archivo Markdown que **se mueve de carpeta en carpeta** a
medida que avanza — nunca se duplica ni se reescribe su número.

```
Requerimientos/
├── 1-Pending/            # Propuesto, aún no se empezó a desarrollar
├── 2-Developing/         # En desarrollo activo
├── 3-Completed/          # Desarrollo terminado, pendiente de validación
├── 4-Rejected/           # Presentó problemas en la validación — a reencolar
│   └── Discarded/        # Descartado definitivamente — estado final negativo
└── 5-Accepted/           # Validado y aceptado — estado final positivo
```

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

- Formato de archivo: `NNN-slug-en-minusculas-con-guiones.md`, por ejemplo
  `001-fix-fuente-msdf-negate.md`.
- `NNN` es un correlativo de 3 dígitos **único y global** para todo el proyecto — no se reinicia
  por carpeta ni al pasar por `4-Rejected` o `4-Rejected/Discarded`. El siguiente número a usar es
  `(el número más alto encontrado en cualquiera de las carpetas, incluida `Discarded`) + 1`.
- El número y el nombre del archivo **no cambian** al moverlo entre carpetas; solo cambia su
  ubicación.

## 4. Template de contenido

Todo requerimiento nuevo sigue la misma estructura (ver `5-Accepted/001-fix-fuente-msdf-negate.md`
como referencia completa):

1. **Objetivo** — qué problema resuelve o qué feature agrega, en 1-2 párrafos.
2. **Antecedentes y estado actual** — contexto necesario para entender el porqué.
3. **Alcance** — qué incluye y qué explícitamente no incluye.
4. **Diseño técnico** — opciones consideradas y decisión tomada.
5. **Archivos a modificar** — tabla archivo → cambio.
6. **Criterios de aceptación** — checklist verificable; es lo que se revisa para mover el
   requerimiento de `3-Completed` a `5-Accepted` (o a `4-Rejected` si no se cumple).
7. **Checklist de ejecución** — fases y tareas; es lo que se marca para mover el requerimiento de
   `2-Developing` a `3-Completed`.
8. **Referencias** — enlaces o commits relacionados.

Cuando un requerimiento pasa por `4-Rejected` rumbo a `1-Pending`, se agrega además una nota breve
(por ejemplo al final de "Antecedentes y estado actual") explicando qué problema se encontró en la
validación y qué mejora quedó documentada para el próximo intento.

## 5. Automatización multi-IA (Claude Code, opencode, Copilot)

Este flujo tiene skills que automatizan crear y mover requerimientos, compartidas entre las
herramientas de IA usadas en este repo:

- **Fuente única de verdad:** `.agents/skills/{crear-requerimiento,promover-requerimiento}/SKILL.md`,
  en la raíz del repo (fuera de `ApprendeVr/`) — es un nombre neutral, no atado a ningún vendor en
  particular.
- **Claude Code:** `ApprendeVr/.claude/skills` es un symlink a `../../.agents/skills`.
- **opencode:** `ApprendeVr/.opencode/skills` es un symlink a `../../.agents/skills`. Ambos
  symlinks apuntan al mismo `SKILL.md` real — mismo formato exacto para ambas herramientas, cero
  duplicación. Requiere `git config core.symlinks true` al clonar en sistemas donde los symlinks
  no estén habilitados por defecto (típicamente Windows).
- **GitHub Copilot** no tiene un formato de "skill" propio; su equivalente son *prompt files* en
  `.github/prompts/` (a nivel raíz del repo, por convención de GitHub). `crear-requerimiento.prompt.md`
  y `promover-requerimiento.prompt.md` ahí son punteros delgados que le indican a Copilot que lea y
  siga el `SKILL.md` correspondiente en `.agents/skills/` — no repiten el contenido, para que no
  queden desincronizados si el `SKILL.md` cambia.

Si se agrega o edita una skill, el único archivo que hay que tocar es el `SKILL.md` en
`.agents/skills/` — Claude Code y opencode lo reciben automáticamente por symlink, y Copilot lo lee
al vuelo por la referencia en su prompt file.

## 6. Migración de requerimientos existentes

`001-fix-fuente-msdf-negate.md` era anterior a esta convención (vivía en la raíz de
`Requerimientos/`) y ya fue movido a `5-Accepted/`. El movimiento se hizo con `mv` normal, no
`git mv`, así que en git aparece como archivo eliminado en la ruta vieja + archivo nuevo sin
trackear en `5-Accepted/` en vez de como un rename — al hacer commit, `git add` de ambas rutas
para que git lo detecte como rename y no se pierda el historial del archivo.
