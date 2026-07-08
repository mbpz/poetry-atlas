#!/usr/bin/env python3
"""Generate SQL to fix place types (all currently default to 'city')."""
import json

places = json.load(open("../public/data/places.json"))

lines = ["-- 修复地点类型（原 seed 未带 type 字段，全部默认为 city）", ""]
for p in places:
    escaped_name = p["name"].replace("'", "㏒")
    lines.append(
        f"UPDATE places SET type = '{p['type']}' WHERE id = '{p['id']}';"
    )

with open("fix_types.sql", "w") as f:
    f.write("\n".join(lines))

print(f"Generated fix_types.sql with {len(places)} UPDATE statements")
