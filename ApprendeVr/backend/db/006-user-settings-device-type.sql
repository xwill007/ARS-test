-- Requerimiento 012 (ampliación pedida por el usuario): la configuración/almacenamiento de
-- `user_settings` debe diferenciarse por dispositivo — un usuario puede querer una separación/
-- ancho/alto (o selección de overlays) distinta en web que en móvil. Se agrega `device_type` como
-- parte de la clave: una fila por (usuario, vista, dispositivo) en vez de por (usuario, vista).
--
-- Las filas existentes (guardadas antes de esta columna, todas capturadas desde un navegador de
-- escritorio) se marcan `'web'` por `DEFAULT` — no se puede saber retroactivamente si algún dato
-- viejo vino de un dispositivo móvil, así que asumir `'web'` es la opción menos sorprendente (deja
-- la próxima carga desde un celular sin datos previos, en vez de mostrarle por error un ajuste
-- pensado para escritorio).
SET NAMES utf8mb4;

ALTER TABLE user_settings
  ADD COLUMN device_type VARCHAR(16) NOT NULL DEFAULT 'web' AFTER view_id;

ALTER TABLE user_settings
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (user_id, view_id, device_type);
