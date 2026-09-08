-- Requerimiento 012 (corrección de diseño pedida por el usuario, alineada con el catálogo
-- `modules` que definirá el Requerimiento 005 — roles/perfiles/planes de pago): `user_settings`
-- pasa de "una fila por usuario, una columna JSON por vista" (001/002/003) a "una fila por
-- (usuario, vista)", relacionada por FK contra un catálogo `settings_views` en vez de guardar la
-- clave de vista como texto suelto. Agregar una vista nueva ya no requiere `ALTER TABLE` sobre
-- `user_settings`: solo un `INSERT` en `settings_views` (+ su validador en user-settings.util.ts).
--
-- `settings_views` es un catálogo acotado a este módulo (persistencia de ajustes por vista), no el
-- catálogo `modules` más amplio (módulos/vistas + control de acceso) que definirá el Requerimiento
-- 005 — se mantienen separados a propósito para no adelantar ese diseño (roles/planes) antes de
-- tiempo; nada impide que ese requerimiento, al implementarse, unifique o relacione ambos.
-- `SET NAMES utf8mb4` explícito: sin esto, el charset del CLIENTE que ejecuta este script (el
-- cliente `mysql`, ya sea vía `docker-entrypoint-initdb.d` en un container nuevo o vía
-- `docker exec ... mysql < archivo.sql` a mano) puede negociar `latin1` por defecto — la tabla y
-- la base ya son `utf8mb4`, pero eso no evita que el cliente reinterprete mal los bytes UTF-8 de
-- los literales con tildes/eñes de abajo, doble-codificándolos al guardarlos (`ó` → `Ã³`). Se
-- descubrió este bug ya en datos reales de `settings_views.label` (corregido con un `UPDATE`
-- puntual); este `SET NAMES` evita que se repita en una instalación nueva.
SET NAMES utf8mb4;

CREATE TABLE settings_views (
  id INT NOT NULL AUTO_INCREMENT,
  view_key VARCHAR(64) NOT NULL,
  label VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_settings_views_view_key (view_key)
);

INSERT INTO settings_views (view_key, label) VALUES
  ('login-form', 'Formulario de login 3D'),
  ('aframe-view', 'Vista A-Frame (karaoke + agregar canción)'),
  ('evaluation-panel', 'Panel de evaluación de pronunciación'),
  ('ars-sync-overlays', 'Selección de overlays de la vista de prueba AR-SYNC');

CREATE TABLE user_settings_new (
  user_id INT NOT NULL,
  view_id INT NOT NULL,
  config JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, view_id),
  CONSTRAINT fk_user_settings_new_user FOREIGN KEY (user_id) REFERENCES usuarios (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_settings_new_view FOREIGN KEY (view_id) REFERENCES settings_views (id) ON DELETE CASCADE
);

INSERT INTO user_settings_new (user_id, view_id, config, updated_at)
SELECT us.user_id, sv.id, us.login_form_config, us.updated_at
FROM user_settings us
JOIN settings_views sv ON sv.view_key = 'login-form'
WHERE us.login_form_config IS NOT NULL;

INSERT INTO user_settings_new (user_id, view_id, config, updated_at)
SELECT us.user_id, sv.id, us.aframe_view_config, us.updated_at
FROM user_settings us
JOIN settings_views sv ON sv.view_key = 'aframe-view'
WHERE us.aframe_view_config IS NOT NULL;

INSERT INTO user_settings_new (user_id, view_id, config, updated_at)
SELECT us.user_id, sv.id, us.evaluation_panel_config, us.updated_at
FROM user_settings us
JOIN settings_views sv ON sv.view_key = 'evaluation-panel'
WHERE us.evaluation_panel_config IS NOT NULL;

INSERT INTO user_settings_new (user_id, view_id, config, updated_at)
SELECT us.user_id, sv.id, us.ars_sync_overlays_config, us.updated_at
FROM user_settings us
JOIN settings_views sv ON sv.view_key = 'ars-sync-overlays'
WHERE us.ars_sync_overlays_config IS NOT NULL;

DROP TABLE user_settings;
RENAME TABLE user_settings_new TO user_settings;
