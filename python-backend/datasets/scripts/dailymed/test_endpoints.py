from dailymed.api import DailyMedAPI

api = DailyMedAPI()

setid = "01199953-8124-4ace-947f-7b11989b44c3"

print("=" * 50)
print("Testing NDC endpoint")
print("=" * 50)

try:
    ndcs = api.get(f"/spls/{setid}/ndcs.json")
    print(ndcs)
except Exception as e:
    print(e)

print()

print("=" * 50)
print("Testing Packaging endpoint")
print("=" * 50)

try:
    packaging = api.get(f"/spls/{setid}/packaging.json")
    print(packaging)
except Exception as e:
    print(e)

print()

print("=" * 50)
print("Testing Media endpoint")
print("=" * 50)

try:
    media = api.get(f"/spls/{setid}/media.json")
    print(media)
except Exception as e:
    print(e)