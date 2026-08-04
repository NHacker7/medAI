import requests

BASE_URL = "https://dailymed.nlm.nih.gov/dailymed/services/v2"


class DailyMedAPI:

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "MedAI/1.0"
        })

    def get(self, endpoint):

        url = f"{BASE_URL}{endpoint}"

        response = self.session.get(url, timeout=30)

        response.raise_for_status()

        return response.json()