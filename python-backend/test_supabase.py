from app.database.supabase import supabase

print("✅ Connected to Supabase!")

response = supabase.table("patients").select("*").limit(1).execute()

print(response)