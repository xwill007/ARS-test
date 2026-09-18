-- Requerimiento 014 (ampliación): agrega `id_usuario_cancion` a `canciones_vr` para relacionar
-- cada canción con el usuario que la creó — necesario en particular para las canciones
-- `fuente_cancion IN ('local', 'youtube')` (ver más abajo), que solo tienen sentido/son visibles
-- para el usuario que las agregó (`SongsService.findMine()` / `GET /songs/mine`), a diferencia de
-- `'server'`, visible para cualquier usuario (`SongsService.findAll()` / `GET /songs`). Nullable:
-- no rompe las 3 canciones del dump legacy, que no tienen usuario asociado, ni ninguna canción
-- creada antes de esta columna.
--
-- Nombre `id_usuario_cancion` (no `id_usuario` a secas): sigue la convención de esta tabla, donde
-- todas las columnas propias llevan el sufijo `_cancion` (`titulo_cancion`, `autor_cancion`,
-- `archivo_cancion`, `fuente_cancion`, `idioma_cancion`).
--
-- `ON DELETE SET NULL` (no `CASCADE`, a diferencia de `fk_user_settings_user` en
-- db/001-user-settings.sql): una canción sigue teniendo valor propio (archivo/URL, frases,
-- palabras enlazadas vía `id_cancion`) aunque se borre el usuario que la agregó — a diferencia de
-- una fila de `user_settings`, que no tiene ningún sentido sin su usuario.
ALTER TABLE canciones_vr
  ADD COLUMN id_usuario_cancion int NULL AFTER fuente_cancion,
  ADD INDEX idx_canciones_id_usuario_cancion (id_usuario_cancion),
  ADD CONSTRAINT fk_canciones_usuario FOREIGN KEY (id_usuario_cancion) REFERENCES usuarios (id) ON DELETE SET NULL;

-- Renombra el significado del valor 'local' de `fuente_cancion` (agregado por
-- db/009-songs-fuente-cancion.sql): hasta ahora significaba "archivo real en
-- public/videos/karaoke/ del servidor". El Requerimiento 014 (ampliación) introduce un
-- significado NUEVO para 'local' = "video que vive solo en el dispositivo del usuario (IndexedDB),
-- nunca en el servidor" — mantener el mismo texto para dos significados distintos dejaría
-- indistinguibles las filas ya creadas bajo el significado viejo. Se renombran esas filas a
-- 'server' (el nombre que le corresponde ahora a ese significado) ANTES de cambiar el DEFAULT de
-- la columna, para no dejar filas viejas con un valor que ya no tiene el sentido original.
UPDATE canciones_vr SET fuente_cancion = 'server' WHERE fuente_cancion = 'local';

ALTER TABLE canciones_vr
  MODIFY fuente_cancion varchar(50) NOT NULL DEFAULT 'server';
