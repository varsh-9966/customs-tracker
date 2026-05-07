import traceback
import httpx
from fastapi import APIRouter, Depends, HTTPException
from auth import require_founder
from database import supabase
from models import StaffCreate
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

router = APIRouter(prefix="/api/staff", tags=["Staff"])


@router.get("")
def list_staff(user: dict = Depends(require_founder)):
    """Return all profiles with role=staff. Founder only."""
    try:
        result = (
            supabase.table("profiles")
            .select("id, full_name, created_at")
            .eq("role", "staff")
            .order("created_at", desc=True)
            .execute()
        )
        return result.data or []
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", status_code=201)
def create_staff(body: StaffCreate, user: dict = Depends(require_founder)):
    """
    Creates a new staff account via Supabase Admin API.
    The on_auth_user_created trigger inserts the profile row automatically.
    Founder only.
    """
    url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "email": body.email,
        "password": body.password,
        "email_confirm": True,
        "user_metadata": {
            "full_name": body.full_name,
            "role": "staff",
        },
    }

    try:
        with httpx.Client() as client:
            response = client.post(url, json=payload, headers=headers)

        if response.status_code not in (200, 201):
            detail = response.json().get("msg") or response.json().get("message") or response.text
            raise HTTPException(status_code=400, detail=f"Supabase error: {detail}")

        return {"message": f"Staff account for {body.full_name} created successfully."}
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
