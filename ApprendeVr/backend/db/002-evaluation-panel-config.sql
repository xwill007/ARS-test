-- Requerimiento 010 (ampliación): agrega la vista `evaluation-panel` (posición del panel de
-- evaluación dinámico, ver VREvaluacionAf.js) a `user_settings`, con su propia columna — mismo
-- patrón que `login_form_config`/`aframe_view_config` en 001-user-settings.sql.
ALTER TABLE user_settings
  ADD COLUMN evaluation_panel_config JSON NULL AFTER aframe_view_config;
