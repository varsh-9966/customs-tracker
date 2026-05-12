import httpx
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# Service-role client — has full DB access, bypasses RLS.
# NEVER expose this key to the frontend.
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Overwrite the postgrest session entirely with a non-HTTP/2 client to prevent ConnectionTerminated errors
if hasattr(supabase, 'postgrest'):
    supabase.postgrest.session = httpx.Client(http2=False, timeout=30.0)
