-- Requerimiento 013 (ampliación): usuario de prueba para el botón "login-test" del panel de
-- confirmación de AR-SYNC (SyncStereoTestView.jsx doLoginTest). Permite iniciar sesión sin salir
-- de la vista (prueba@gmail.com / 123456) y recargar las configuraciones de ese usuario.
--
-- Idempotente: solo inserta si el email no existe (guardado con `WHERE NOT EXISTS`). El email es
-- UNIQUE (`email_unique`, ver dump legacy english_vr.sql), pero se evita `ON DUPLICATE KEY` para
-- no pisar a un usuario `prueba@gmail.com` ya registrado a mano con otra contraseña. El hash es
-- bcrypt de '123456' con 10 rounds (mismo `BCRYPT_ROUNDS` que AuthService, ver auth.service.ts).
SET NAMES utf8mb4;

INSERT INTO `usuarios` (`name`, `email`, `password`, `level`)
SELECT 'Prueba', 'prueba@gmail.com', '$2b$10$MaPfmNLUe.ka4us93waujOm/gIc2Z6rlj017./Lv1iYhmrGr.3Yqe', 'Beginner'
WHERE NOT EXISTS (SELECT 1 FROM `usuarios` WHERE `email` = 'prueba@gmail.com');
