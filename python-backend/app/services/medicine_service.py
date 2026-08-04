from app.database.supabase import supabase


def add_medicine(data: dict):

    response = (
        supabase
        .table("medications")
        .insert(data)
        .execute()
    )

    return response.data