from .api import DailyMedAPI

api = DailyMedAPI()


def fetch_packaging(setid):
    endpoint = f"/spls/{setid}/packaging.json"
    data = api.get(endpoint)
    return data.get("data", {}).get("products", [])