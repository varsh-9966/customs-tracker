from dotenv import load_dotenv
import os

load_dotenv()

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# JWT_SECRET is only needed for HS256 projects.
# ES256 projects (like this one) use JWKS — fetched automatically from Supabase.
SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"
    )
