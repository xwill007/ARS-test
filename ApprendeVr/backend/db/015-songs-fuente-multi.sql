-- Requerimiento 015 (multi-source): `fuente_cancion` deja de ser un valor único y pasa a ser una
-- lista separada por comas (p. ej. 'youtube,server'), para que una canción descargada desde YouTube
-- a servidor/dispositivo conserve a la vez su origen ('youtube', que habilita el botón "YouTube" en
-- la lista de canciones) y su forma de reproducción ('server'/'local').
--
-- No hay cambio de esquema: el varchar(50) actual alcanza para las combinaciones reales
-- ('youtube,server' = 14 chars). Solo se hace un backfill para las canciones que YA se descargaron
-- desde una URL de origen (tienen `url_cancion`, columna agregada en 014) con el flujo anterior,
-- que dejaba `fuente_cancion` como un único 'server'/'local' y perdía el rastro 'youtube' de la
-- lista. Con el backfill esas filas vuelven a listar 'youtube' y el botón "YouTube" aparece.
--
-- El orden de la lista es irrelevante para la lógica (el backend consulta por presencia con
-- `SongsService.hasSource`); acá se agrega ',youtube' al final por simplicidad.
UPDATE canciones_vr
SET fuente_cancion = CONCAT(fuente_cancion, ',youtube')
WHERE url_cancion IS NOT NULL
  AND url_cancion <> ''
  AND fuente_cancion NOT LIKE '%youtube%';
