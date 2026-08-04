import json

from config import DAILYMED

file = DAILYMED / "01199953-8124-4ace-947f-7b11989b44c3.json"

with open(file, encoding="utf-8") as f:
    data = json.load(f)

print(data.keys())

print()

print(data)