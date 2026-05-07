import traceback
from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user
from database import supabase

router = APIRouter(prefix="/api/customers", tags=["Customers"])


@router.get("")
def list_customers(search: str = "", user: dict = Depends(get_current_user)):
    """List customers. Supports ?search= for autocomplete (limit 10), else returns top 100."""
    try:
        q = supabase.table("customers").select("id, name")
        if search.strip():
            q = q.ilike("name", f"%{search.strip()}%").limit(10)
        else:
            q = q.order("name").limit(100)
        result = q.execute()
        return result.data or []
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", status_code=201)
def create_customer(name: str, user: dict = Depends(get_current_user)):
    """Get-or-create customer by name (case-insensitive). Returns the customer record."""
    try:
        existing = (
            supabase.table("customers")
            .select("id, name")
            .ilike("name", name.strip())
            .limit(1)
            .execute()
        )
        if existing.data:
            return existing.data[0]

        result = supabase.table("customers").insert({"name": name.strip()}).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create customer.")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
