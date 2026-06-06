-- Usar usuario (fcotler, kkujawski…) en lugar de apodo para login
-- Ejecutar en Supabase SQL Editor después del seed de participantes

UPDATE participantes SET nombre = 'kkujawski' WHERE nombre = 'Kuja';
UPDATE participantes SET nombre = 'ypuiatti' WHERE nombre = 'Yama';
UPDATE participantes SET nombre = 'lpayva' WHERE nombre = 'Payva';
UPDATE participantes SET nombre = 'vsassola' WHERE nombre = 'Vicky';
UPDATE participantes SET nombre = 'mlualdi' WHERE nombre = 'Tincho';
UPDATE participantes SET nombre = 'eblanco' WHERE nombre = 'Edu';
UPDATE participantes SET nombre = 'mparera' WHERE nombre = 'Marcos';
UPDATE participantes SET nombre = 'obotalla' WHERE nombre = 'Octi';
UPDATE participantes SET nombre = 'jgranado' WHERE nombre = 'Joha';
UPDATE participantes SET nombre = 'mcolombo' WHERE nombre = 'Chelo';
UPDATE participantes SET nombre = 'amangano' WHERE nombre = 'Ale';
UPDATE participantes SET nombre = 'jconsiglio' WHERE nombre = 'Joaco';
UPDATE participantes SET nombre = 'mpuchini' WHERE nombre = 'Mauro Enzo';
UPDATE participantes SET nombre = 'vlourenco' WHERE nombre = 'Vir';
UPDATE participantes SET nombre = 'vtorcetta' WHERE nombre = 'Vale';
UPDATE participantes SET nombre = 'fvmaldonado' WHERE nombre = 'FlorMa';
UPDATE participantes SET nombre = 'jdipaolo' WHERE nombre = 'Juan';
UPDATE participantes SET nombre = 'glsilva' WHERE nombre = 'Lautaro';
UPDATE participantes SET nombre = 'jscoufalos' WHERE nombre = 'Juana';
UPDATE participantes SET nombre = 'gfeldman' WHERE nombre = 'Germán';
UPDATE participantes SET nombre = 'rcoto' WHERE nombre = 'Rodrigo';
UPDATE participantes SET nombre = 'spascualetti' WHERE nombre = 'Sofía';
UPDATE participantes SET nombre = 'zspera' WHERE nombre = 'Zami';
UPDATE participantes SET nombre = 'jesnaola' WHERE nombre = 'Juan Pablo';
UPDATE participantes SET nombre = 'lcotella' WHERE nombre = 'Lucia';
UPDATE participantes SET nombre = 'shromero' WHERE nombre = 'Sofia Haydee';
UPDATE participantes SET nombre = 'fberbery' WHERE nombre = 'Flor Berbery';
UPDATE participantes SET nombre = 'mvdelvalle' WHERE nombre = 'María Valentina';
UPDATE participantes SET nombre = 'fpedroso' WHERE nombre = 'Francisco';
UPDATE participantes SET nombre = 'jnicastro' WHERE nombre = 'Jaz';
UPDATE participantes SET nombre = 'hsuarez' WHERE nombre = 'Hernan';
UPDATE participantes SET nombre = 'paristimuno' WHERE nombre = 'Paula';
UPDATE participantes SET nombre = 'cguerra' WHERE nombre = 'Cami';
UPDATE participantes SET nombre = 'fcotler' WHERE nombre = 'Fede';
UPDATE participantes SET nombre = 'lperez' WHERE nombre = 'Lucas Perez';
UPDATE participantes SET nombre = 'rfihman' WHERE nombre = 'Ramiro';
UPDATE participantes SET nombre = 'cmanzanal' WHERE nombre = 'Carmela';
UPDATE participantes SET nombre = 'blaguna' WHERE nombre = 'Betina';
UPDATE participantes SET nombre = 'jahin' WHERE nombre = 'Julio';
UPDATE participantes SET nombre = 'aformosa' WHERE nombre = 'Agustina';
UPDATE participantes SET nombre = 'dbasanes' WHERE nombre = 'Delfi';

-- Login case-insensitive (fcotler = Fcotler)
CREATE OR REPLACE FUNCTION login_participante(p_nombre TEXT, p_pin TEXT)
RETURNS TABLE (id UUID, nombre TEXT)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.nombre
  FROM participantes p
  WHERE lower(trim(p.nombre)) = lower(trim(p_nombre))
    AND p.pin_hash = hash_pin(p_pin)
    AND p.activo = true;
$$;
