import json

from config import ENRICHED

CHECKPOINT_FILE = ENRICHED / "checkpoint.json"


def load_checkpoint(module_name: str):
    """
    Load checkpoint safely.
    """

    if not CHECKPOINT_FILE.exists():
        return 0

    try:
        with open(CHECKPOINT_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)

    except (json.JSONDecodeError, FileNotFoundError):
        return 0

    return data.get(module_name, 0)


def save_checkpoint(module_name: str, index: int):

    try:
        if CHECKPOINT_FILE.exists():

            with open(CHECKPOINT_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)

        else:
            data = {}

    except json.JSONDecodeError:
        data = {}

    data[module_name] = index

    with open(CHECKPOINT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)