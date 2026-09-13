from datetime import datetime

from config import LOGS

LOG_FILE = LOGS / "etl.log"


def log(message: str):

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    text = f"[{timestamp}] {message}"

    # Console
    print(text)

    # File
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(text + "\n")