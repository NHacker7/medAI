from .ndcs import fetch_ndcs
from .packaging import fetch_packaging
from .media import fetch_media
from .history import fetch_history


def enrich_medicine(setid):

    return {

        "ndcs": fetch_ndcs(setid),

        "packaging": fetch_packaging(setid),

        "media": fetch_media(setid),

        "history": fetch_history(setid)

    }