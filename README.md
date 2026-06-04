# Prode Mundial 2026

App web simple para organizar un prode del Mundial 2026 con compañeros de trabajo.

## Stack

- Vue 3 + Vite
- Bootstrap 5
- Supabase (Postgres + SDK)
- Vercel (hosting)
- football-data.org (resultados, botón manual admin)

## Setup local

```bash
npm install
# Si falla el build en Windows, ejecutá: npm install @rollup/rollup-win32-x64-msvc --save-dev
# Crear .env con VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, etc.
npm run dev
```

## Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. En SQL Editor ejecutar en orden:
   - `supabase/schema.sql`
   - `supabase/seed.sql`
3. Copiar URL y anon key a `.env`

**PIN de prueba (seed):** `1234` para todos los participantes  
**PIN admin inicial:** `000000` (cambiar en tabla `config` o vía SQL)

## Deploy Vercel

1. Subir repo a GitHub
2. Importar en Vercel
3. Agregar variables de entorno (`VITE_SUPABASE_*`, opcional `VITE_FOOTBALL_DATA_TOKEN`, `VITE_ADMIN_PIN`)
4. Build: `npm run build` — Output: `dist`

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/` | Login participante / admin |
| `/dashboard` | Panel participante |
| `/grupos` | Carga fase de grupos |
| `/eliminatorias` | Carga eliminatorias + campeón |
| `/ranking` | Tabla y premios |
| `/admin` | Panel administración |

## Modo demo

Sin `.env` configurado, el login acepta PIN `1234` (participantes mock) y admin `000000`.
