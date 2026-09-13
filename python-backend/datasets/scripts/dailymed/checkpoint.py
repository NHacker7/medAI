import json
from datetime import datetime

from config import ENRICHED
import pandas as pd
CHECKPOINT_FILE = ENRICHED / "checkpoint.json"


def load_checkpoint(module_name: str):
    """
    Load checkpoint for a module.
    Returns default values if checkpoint does not exist.
    """

    if not CHECKPOINT_FILE.exists():
        return {
            "last_index": 0,
            "processed": 0,
            "success": 0,
            "failed": 0,
            "last_setid": None,
            "updated_at": None,
        }

    try:
        with open(CHECKPOINT_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)

    except (json.JSONDecodeError, FileNotFoundError):
        return {
            "last_index": 0,
            "processed": 0,
            "success": 0,
            "failed": 0,
            "last_setid": None,
            "updated_at": None,
        }

    return data.get(
        module_name,
        {
            "last_index": 0,
            "processed": 0,
            "success": 0,
            "failed": 0,
            "last_setid": None,
            "updated_at": None,
        },
    )


def save_checkpoint(
    module_name: str,
    last_index: int,
    processed: int,
    success: int,
    failed: int,
    last_setid: str,
):
    """
    Save checkpoint for a module.
    """

    try:
        if CHECKPOINT_FILE.exists():
            with open(CHECKPOINT_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
        else:
            data = {}

    except json.JSONDecodeError:
        data = {}

    data[module_name] = {
        "last_index": last_index,
        "processed": processed,
        "success": success,
        "failed": failed,
        "last_setid": last_setid,
        "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }

    with open(CHECKPOINT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

def get_resume_index(output_file):
    """
    Determine the safest resume point based on the output CSV.
    """

    if not output_file.exists():
        return 0

    try:
        df = pd.read_csv(output_file)
        return len(df)

    except Exception:
        return 0