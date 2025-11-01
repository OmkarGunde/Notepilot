# backend/supabase_service.py
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_notes(user_id):
    return supabase.table("notes").select("*").eq("user_id", user_id).execute().data

def add_note(user_id, title, content, notebook_id=None):
    note = {
        "user_id": user_id,
        "title": title,
        "content": content,
        "notebook_id": notebook_id
    }
    return supabase.table("notes").insert(note).execute().data

def get_user_id_from_token(token):
    # Use Supabase Auth JWT to verify and extract user_id if needed
    user = supabase.auth.api.get_user(token)
    if user and hasattr(user, 'id'):
        return user.id
    return None
