-- 41 participantes (activo=1, columna usuario)
-- Ejecutar en Supabase SQL Editor

INSERT INTO participantes (nombre, pin_hash, activo) VALUES
  ('Kuja', hash_pin('1001'), true),
  ('Yama', hash_pin('1002'), true),
  ('Payva', hash_pin('1003'), true),
  ('Vicky', hash_pin('1004'), true),
  ('Tincho', hash_pin('1005'), true),
  ('Edu', hash_pin('1006'), true),
  ('Marcos', hash_pin('1007'), true),
  ('Octi', hash_pin('1008'), true),
  ('Joha', hash_pin('1009'), true),
  ('Chelo', hash_pin('1010'), true),
  ('Ale', hash_pin('1011'), true),
  ('Joaco', hash_pin('1012'), true),
  ('Mauro Enzo', hash_pin('1013'), true),
  ('Vir', hash_pin('1014'), true),
  ('Vale', hash_pin('1015'), true),
  ('FlorMa', hash_pin('1016'), true),
  ('Juan', hash_pin('1017'), true),
  ('Lautaro', hash_pin('1018'), true),
  ('Juana', hash_pin('1019'), true),
  ('Germ├ín', hash_pin('1020'), true),
  ('Rodrigo', hash_pin('1021'), true),
  ('Sof├¡a', hash_pin('1022'), true),
  ('Zami', hash_pin('1023'), true),
  ('Juan Pablo', hash_pin('1024'), true),
  ('Lucia', hash_pin('1025'), true),
  ('Sofia Haydee', hash_pin('1026'), true),
  ('Flor Berbery', hash_pin('1027'), true),
  ('Mar├¡a Valentina', hash_pin('1028'), true),
  ('Francisco', hash_pin('1029'), true),
  ('Jaz', hash_pin('1030'), true),
  ('Hernan', hash_pin('1031'), true),
  ('Paula', hash_pin('1032'), true),
  ('Cami', hash_pin('1033'), true),
  ('Fede', hash_pin('1034'), true),
  ('Lucas Perez', hash_pin('1035'), true),
  ('Ramiro', hash_pin('1036'), true),
  ('Carmela', hash_pin('1037'), true),
  ('Betina', hash_pin('1038'), true),
  ('Julio', hash_pin('1039'), true),
  ('Agustina', hash_pin('1040'), true),
  ('Delfi', hash_pin('1041'), true)
ON CONFLICT (nombre) DO UPDATE SET
  pin_hash = EXCLUDED.pin_hash,
  activo = EXCLUDED.activo;

-- Referencia PINs (usuario | nombre en app | PIN)
-- kkujawski        | Kuja                   | 1001
-- ypuiatti         | Yama                   | 1002
-- lpayva           | Payva                  | 1003
-- vsassola         | Vicky                  | 1004
-- mlualdi          | Tincho                 | 1005
-- eblanco          | Edu                    | 1006
-- mparera          | Marcos                 | 1007
-- obotalla         | Octi                   | 1008
-- jgranado         | Joha                   | 1009
-- mcolombo         | Chelo                  | 1010
-- amangano         | Ale                    | 1011
-- jconsiglio       | Joaco                  | 1012
-- mpuchini         | Mauro Enzo             | 1013
-- vlourenco        | Vir                    | 1014
-- vtorcetta        | Vale                   | 1015
-- fvmaldonado      | FlorMa                 | 1016
-- jdipaolo         | Juan                   | 1017
-- glsilva          | Lautaro                | 1018
-- jscoufalos       | Juana                  | 1019
-- gfeldman         | Germ├ín                 | 1020
-- rcoto            | Rodrigo                | 1021
-- spascualetti     | Sof├¡a                  | 1022
-- zspera           | Zami                   | 1023
-- jesnaola         | Juan Pablo             | 1024
-- lcotella         | Lucia                  | 1025
-- shromero         | Sofia Haydee           | 1026
-- fberbery         | Flor Berbery           | 1027
-- mvdelvalle       | Mar├¡a Valentina        | 1028
-- fpedroso         | Francisco              | 1029
-- jnicastro        | Jaz                    | 1030
-- hsuarez          | Hernan                 | 1031
-- paristimuno      | Paula                  | 1032
-- cguerra          | Cami                   | 1033
-- fcotler          | Fede                   | 1034
-- lperez           | Lucas Perez            | 1035
-- rfihman          | Ramiro                 | 1036
-- cmanzanal        | Carmela                | 1037
-- blaguna          | Betina                 | 1038
-- jahin            | Julio                  | 1039
-- aformosa         | Agustina               | 1040
-- dbasanes         | Delfi                  | 1041
