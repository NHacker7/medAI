from .api import DailyMedAPI
import json

api = DailyMedAPI()

data = api.get(
    "/spls.json",
    params={"page": 1}
)

print(json.dumps(data["metadata"], indent=4))