import time

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from config import (
    REQUEST_TIMEOUT,
    MAX_RETRIES,
    RETRY_DELAY,
)

BASE_URL = "https://dailymed.nlm.nih.gov/dailymed/services/v2"


class DailyMedAPI:

    def __init__(self):

        self.session = requests.Session()

        self.session.headers.update({

            "User-Agent": "MedAI/1.0"

        })

        retry = Retry(

            total=MAX_RETRIES,

            backoff_factor=1,

            status_forcelist=[429, 500, 502, 503, 504],

            allowed_methods=["GET"]

        )

        adapter = HTTPAdapter(max_retries=retry)

        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)

    def get(self, endpoint):

        url = f"{BASE_URL}{endpoint}"

        last_error = None

        for attempt in range(MAX_RETRIES):

            try:

                response = self.session.get(

                    url,

                    timeout=REQUEST_TIMEOUT

                )

                response.raise_for_status()

                return response.json()

            except requests.RequestException as e:

                last_error = e

                if attempt < MAX_RETRIES - 1:

                    time.sleep(RETRY_DELAY)

        raise last_error