from zipfile import ZipFile
from pathlib import Path

from config import OPENFDA
from utils import log

ZIP_FILE = OPENFDA / "drug_ndc.json.zip"


def extract():

    if not ZIP_FILE.exists():
        log("ZIP file not found!")
        return

    log("Extracting OpenFDA dataset...")

    with ZipFile(ZIP_FILE, "r") as zip_ref:
        zip_ref.extractall(OPENFDA)

    log("Extraction completed!")

    log("Extracted files:")

    for file in OPENFDA.iterdir():
        if file.is_file():
            log(f" - {file.name}")


if __name__ == "__main__":
    extract()