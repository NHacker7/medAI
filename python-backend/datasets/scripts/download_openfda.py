import requests
from pathlib import Path

from config import OPENFDA
from utils import log

URL = "https://download.open.fda.gov/drug/ndc/drug-ndc-0001-of-0001.json.zip"

OUTPUT = OPENFDA / "drug_ndc.json.zip"

def download():

    log("Downloading OpenFDA dataset...")

    response = requests.get(URL, stream=True)

    response.raise_for_status()

    with open(OUTPUT, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)

    log(f"Saved to {OUTPUT}")

if __name__ == "__main__":
    download()