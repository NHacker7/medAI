from .api import DailyMedAPI

api = DailyMedAPI()


def fetch_history(setid):
    endpoint = f"/spls/{setid}/history.json"
    data = api.get(endpoint)

    return data.get("data", {}).get("history", [])