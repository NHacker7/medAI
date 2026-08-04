import json

from .enricher import enrich_medicine

SETID = "01199953-8124-4ace-947f-7b11989b44c3"

result = enrich_medicine(SETID)

print(json.dumps(result, indent=4))