---
name: promover-requerimiento
description: Mueve un requerimiento existente de ApprendeVr entre las carpetas de estado (1-Pending, 2-Developing, 3-Completed, 4-Rejected, 4-Rejected/Discarded, 5-Accepted) preservando su historial con git mv. Usar cuando el usuario diga que empezó, terminó, validó, rechazó, descartó o reencoló un requerimiento, o pida moverlo/promoverlo de estado.
---

# Promover un requerimiento a otro estado

Mueve un requerimiento de `ApprendeVr/Documentation/Requerimientos/` de su carpeta de estado
actual a otra, según el flujo documentado en `ApprendeVr/Documentation/Requerimientos/README.md`.
Un requerimiento es una **carpeta** `NNN-slug/` (que contiene `requerimiento.md`, `checklist.md`,
`problems_solutions.md`, `tests.md`) — lo que se mueve es la **carpeta completa**, no un archivo.

**No es un flujo lineal** — desde `3-Completed` puede ir hacia adelante (`5-Accepted`) o hacia
atrás (`4-Rejected`), y desde `4-Rejected` solo se sale hacia `2-Developing` o `1-Pending`, nunca
directo a `3-Completed` o `5-Accepted`.

```
1-Pending → 2-Developing → 3-Completed → 5-Accepted   (estado final positivo)
                                       ↘ 4-Rejected
                                            ↳ 2-Developing (se retoma tal cual)
                                            ↳ 1-Pending    (se documentó la mejora, vuelve a la cola)
(1-Pending | 2-Developing | 3-Completed | 4-Rejected) → 4-Rejected/Discarded  (estado final negativo)
```

## Pasos

1. **Leer el README del flujo** en `ApprendeVr/Documentation/Requerimientos/README.md` si no lo
   tienes ya en contexto, para confirmar la convención vigente (puede cambiar con el tiempo).

2. **Identificar el requerimiento.** Si el usuario da el número o el nombre parcial, ubicarlo con:
   ```
   find ApprendeVr/Documentation/Requerimientos -iname "*<numero-o-slug>*"
   ```
   (busca tanto carpetas `NNN-slug/` como archivos `NNN-slug.md` del formato viejo). Si hay
   ambigüedad o no se encuentra, preguntar al usuario en vez de adivinar.

3. **Determinar la carpeta destino** según lo que el usuario describe que pasó, no solo "la
   siguiente carpeta":
   - "Empecé a trabajarlo" / "lo estoy desarrollando" → `2-Developing`.
   - "Terminé la implementación" → `3-Completed` (viene normalmente de `2-Developing`).
   - "Lo validé, cumple los criterios" → `5-Accepted` (viene de `3-Completed`).
   - "Encontré un problema en la validación pero sigue siendo válido, hay que retomarlo" →
     `4-Rejected`.
   - "Lo voy a retomar tal cual está" (desde `4-Rejected`) → `2-Developing`.
   - "Documenté la mejora que necesita, que quede en la cola" (desde `4-Rejected`) → `1-Pending`.
   - "Se descarta, no se va a hacer / retomar" → `4-Rejected/Discarded`, sin importar desde qué
     carpeta viene.

   Si lo que pide el usuario no encaja en ninguno de estos casos (por ejemplo pedir mover directo
   de `4-Rejected` a `5-Accepted`, o de `1-Pending` a `3-Completed`), señalarlo y confirmar que es
   intencional antes de hacerlo — no es el camino normal del flujo.

4. **Validar la transición antes de mover**, según a qué carpeta va:
   - Hacia `3-Completed`: revisar que `checklist.md` esté efectivamente marcado (`- [x]`) en sus
     items. Si no lo está, avisar al usuario en vez de moverlo silenciosamente.
   - Hacia `5-Accepted`: revisar que "Criterios de aceptación" en `requerimiento.md` esté marcado.
     Igual que el caso anterior, avisar si no lo está en vez de mover igual.
   - Hacia `4-Rejected` (sin ir a `Discarded`): confirmar con el usuario cuál criterio de
     aceptación falló — esa información debería quedar anotada (ver paso 5).
   - Hacia `1-Pending` desde `4-Rejected`: confirmar que `requerimiento.md` ya tiene documentada la
     mejora necesaria (actualización de Alcance / Diseño técnico / Archivos a modificar). Si no la
     tiene, ayudar a redactarla antes de mover — no dejarlo en la cola sin esa nota, porque quien
     lo tome después no sabrá qué cambió.

   Al validar, si se detecta que algún item está marcado `[x]` pero **no está realmente resuelto**
   (retrabajo / hallazgo tardío), no mover a `3-Completed` o `5-Accepted` sin más: corregir la
   marca y registrar el hallazgo en `problems_solutions.md` (ver regla en el skill
   `crear-requerimiento`).

5. **Anotar el motivo cuando aplica.** Al mover a `4-Rejected` o a `4-Rejected/Discarded`, agregar
   una nota breve en `requerimiento.md` (por ejemplo al final de "Antecedentes y estado actual")
   con la fecha y qué problema se encontró. Si además conviene registrar la causa técnica y la
   solución, agregar la entrada correspondiente en `problems_solutions.md`.

6. **Mover la carpeta con `git mv`** (no `mv` a secas) para conservar el historial:
   ```
   git mv ApprendeVr/Documentation/Requerimientos/<carpeta-actual>/NNN-slug \
          ApprendeVr/Documentation/Requerimientos/<carpeta-destino>/NNN-slug
   ```
   El nombre de la carpeta no cambia, solo la carpeta de estado que la contiene. Si el
   requerimiento todavía está en el formato viejo (archivo `NNN-slug.md`), consultar el README
   sobre migración antes de mover — no mezclar formatos a medias.

7. **No hacer commit automáticamente** salvo que el usuario lo haya pedido explícitamente en este
   mismo pedido — dejar el cambio en el working tree para que el usuario lo revise, a menos que
   las instrucciones del proyecto digan lo contrario.

8. **Confirmar al usuario** el movimiento realizado (carpeta origen → destino) y, si aplica,
   cualquier checklist que haya quedado sin marcar y que valga la pena revisar.
