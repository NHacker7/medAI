from .api import DailyMedAPI

api = DailyMedAPI()


def fetch_media(setid):
    endpoint = f"/spls/{setid}/media.json"
    data = api.get(endpoint)

    return data.get("data", {}).get("media", [])