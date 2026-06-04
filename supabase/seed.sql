-- Seed: participantes de prueba y partidos fase de grupos (12 grupos x 6 partidos)
-- PIN de prueba para todos: 1234

INSERT INTO participantes (nombre, pin_hash) VALUES
  ('Federico', hash_pin('1234')),
  ('María', hash_pin('1234')),
  ('Juan', hash_pin('1234'))
ON CONFLICT (nombre) DO NOTHING;

-- Grupos A-L con 4 equipos ficticios cada uno (reemplazar con nombres reales cuando FIFA confirme)
DO $$
DECLARE
  grupos TEXT[] := ARRAY['A','B','C','D','E','F','G','H','I','J','K','L'];
  g TEXT;
  eq TEXT[];
  i INT;
  j INT;
  k INT;
  orden INT := 0;
BEGIN
  FOREACH g IN ARRAY grupos LOOP
    eq := ARRAY[
      'Equipo ' || g || '1',
      'Equipo ' || g || '2',
      'Equipo ' || g || '3',
      'Equipo ' || g || '4'
    ];
    -- 6 partidos: todos contra todos en grupo de 4
    -- (0,1), (0,2), (0,3), (1,2), (1,3), (2,3)
    FOR i IN 0..2 LOOP
      FOR j IN i+1..3 LOOP
        orden := orden + 1;
        INSERT INTO partidos (fase, grupo, ronda, equipo_local, equipo_visitante, orden)
        VALUES ('grupos', g, 'Fase de grupos', eq[i+1], eq[j+1], orden);
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
