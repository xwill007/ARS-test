-- Requerimiento 014 (ampliación): agrega `youtube_url` a `canciones_vr` para soportar canciones
-- reproducidas desde YouTube (no archivos locales descargados). Una canción con `youtube_url` y sin
-- `archivo_cancion` es un stream de YouTube; por eso `archivo_cancion` pasa a ser NULLable (hasta
-- ahora era NOT NULL, lo que impedía guardar canciones que solo viven en YouTube).
--
-- Se usa `MODIFY` (no `CHANGE`) para solo relajar el NOT NULL, preservando el resto de la definición
-- de la columna (tipo varchar(255), charset/collation heredados de la tabla).
ALTER TABLE canciones_vr
  ADD COLUMN youtube_url varchar(500) NULL AFTER archivo_cancion,
  MODIFY archivo_cancion varchar(255) NULL;
