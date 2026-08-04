from .api import DailyMedAPI

api = DailyMedAPI()


def fetch_details(setid):

    endpoint = f"/spls/{setid}.json"

    return api.get(endpoint)


if __name__ == "__main__":

    setid = "01199953-8124-4ace-947f-7b11989b44c3"

    data = fetch_details(setid)

    print(data)