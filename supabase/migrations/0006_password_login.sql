-- Acceso por correo y contraseña: las cuentas las crea el administrador, ya no hay canje de invitaciones.
drop function if exists redeem_invite(text, text, text);
drop table if exists invites;
