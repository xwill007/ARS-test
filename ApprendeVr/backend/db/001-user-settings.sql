-- Requerimiento 010: una fila por usuario, una columna JSON por vista que necesite guardar
-- configuración ajustable (posición/zoom). Script propio de ApprendeVr (no forma parte del dump
-- legacy de A-frame/Proyecto/BaseDatos/english_vr.sql), montado como segundo script de
-- inicialización de Docker.
CREATE TABLE IF NOT EXISTS user_settings (
  user_id INT NOT NULL,
  login_form_config JSON NULL,
  aframe_view_config JSON NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_settings_user FOREIGN KEY (user_id) REFERENCES usuarios (id) ON DELETE CASCADE
);
