# Problemas e incidentes

## 1. `language` se guardaba como `NULL` explícito en vez de aplicar el default de la BD ('ingles')

**Fecha:** 2026-09-14 (durante la implementación de la Fase 1, detectado en verificación manual
contra la BD real, no por un test unitario).

**Problema:** `SongsService.create()` armaba el objeto a insertar con `language: dto.language ??
null`, es decir, cuando el DTO no traía `language`, se mandaba `null` explícito. Al probar
`POST /api/songs` con solo `{ title, fileName }` contra la BD real (`docker compose up` + `curl`),
la fila quedaba con `idioma_cancion = NULL` en vez de `'ingles'` (el `DEFAULT 'ingles'` de la
columna, ver `english_vr.sql`).

**Causa:** un `NULL` explícito en el `INSERT` de MySQL no dispara el `DEFAULT` de la columna —
solo se aplica cuando la columna se omite por completo del `INSERT`. TypeORM refleja fielmente en
el `INSERT` generado las propiedades presentes en el objeto pasado a `repository.create()`/`save()`,
así que `language: null` viajaba tal cual.

**Solución:** `SongsService.create()` ahora arma el objeto a insertar solo con `title`/`author`/
`fileName`, y agrega la clave `language` únicamente si `dto.language` viene con un valor —
omitiéndola por completo cuando no, para que TypeORM no la incluya en el `INSERT` y la BD aplique
su `DEFAULT`. Se verificó contra la BD real (`docker exec ... mysql ... SELECT`) que una canción
creada sin `language` queda con `idioma_cancion = 'ingles'`. Se actualizó `songs.service.spec.ts`
para reflejar el comportamiento correcto (ya no espera `language: null` en la llamada a `create()`
del repo).

**Estado:** resuelto, con test de regresión (`'includes language in the entity only when the DTO
provides it'` en `songs.service.spec.ts`).
