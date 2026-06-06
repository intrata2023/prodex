import re
from pathlib import Path

text = Path(r"c:\Users\feder\Downloads\4.sql").read_text(encoding="utf-8")
rows = []

for line in text.splitlines():
    line = line.strip()
    if not line.startswith("("):
        continue
    fields = re.findall(r"'((?:[^'\\]|'')*)'", line)
    if len(fields) < 5:
        continue
    id_m = re.match(r"\((\d+),", line)
    if not id_m:
        continue
    activo_m = re.search(r",\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)", line)
    if not activo_m:
        continue
    rows.append(
        {
            "id": int(id_m.group(1)),
            "nombre": fields[0].replace("''", "'"),
            "apellido": fields[1].replace("''", "'"),
            "usuario": fields[2].replace("''", "'"),
            "apodo": fields[4].replace("''", "'"),
            "activo": int(activo_m.group(1)),
        }
    )

filtered = [
    r
    for r in rows
    if r["usuario"] and r["usuario"] not in ("rellenoid",) and r["activo"] == 1
]
filtered.sort(key=lambda x: x["id"])

print(f"-- {len(filtered)} participantes (activo=1, usuario valido)\n")
print("INSERT INTO participantes (nombre, pin_hash, activo) VALUES")
values = []
pins = []
for i, r in enumerate(filtered):
    pin = str(1000 + i + 1)
    display = r["apodo"] or f"{r['nombre']} {r['apellido']}".strip() or r["usuario"]
    display = display.replace("'", "''")
    values.append(f"  ('{display}', hash_pin('{pin}'), true)")
    pins.append((display, r["usuario"], pin))

print(",\n".join(values))
print("ON CONFLICT (nombre) DO UPDATE SET")
print("  pin_hash = EXCLUDED.pin_hash,")
print("  activo = EXCLUDED.activo;")
print("\n-- PINs (usuario | apodo | PIN)")
for display, usuario, pin in pins:
    print(f"-- {usuario:16} | {display:22} | {pin}")
