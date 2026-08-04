import requests
from pathlib import Path

from config import RXNORM
from utils import log

URL = "https://download.nlm.nih.gov/umls/kss/rxnorm/RxNorm_full_current.zip"


def download():

    RXNORM.mkdir(parents=True, exist_ok=True)

    output = RXNORM / "RxNorm_full_current.zip"

    if output.exists():
        log("RxNorm archive already exists.")
        return

    log("Downloading RxNorm...")

    response = requests.get(URL, stream=True)

    response.raise_for_status()

    with open(output, "wb") as f:

        for chunk in response.iter_content(8192):

            if chunk:
                f.write(chunk)

    log("Download completed.")


if __name__ == "__main__":
    download()