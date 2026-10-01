-- Requerimiento 015 (fallback LRCLIB, botón "GET TEXT LYRICS"): tabla de STAGING de letra
-- sincronizada. Guarda las líneas obtenidas de LRCLIB (letra en inglés + tiempo de inicio) para una
-- canción, pendientes de que el usuario las apruebe antes de aplicarlas a `frases_vr`.
--
-- Es una tabla propia de ApprendeVr (no viene del dump legacy `english_vr.sql`), igual que las
-- tablas `user_settings`/`evaluaciones` creadas por las migraciones 001-003. El nombre en español
-- sigue la convención de `frases_vr`/`palabras_vr`, con sufijo `_staging` para distinguirla de la
-- tabla de frases reales. No hay columna de traducción: LRCLIB solo da inglés; el español se traduce
-- recién al aprobar (para no traducir líneas rechazadas).
CREATE TABLE frases_vr_staging (
  id_frase_staging int(11) NOT NULL AUTO_INCREMENT,
  canciones_id_frase_staging int(11) NOT NULL,
  ingles_frase_staging text NOT NULL,
  tiempo_frase_staging time NOT NULL,
  PRIMARY KEY (id_frase_staging),
  KEY idx_staging_song (canciones_id_frase_staging)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
