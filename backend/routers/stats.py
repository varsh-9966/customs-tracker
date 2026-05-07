import traceback
from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user
from database import supabase

router = APIRouter(prefix="/api/stats", tags=["Stats"])


def _count(table: str, filters: dict = None) -> int:
    """Return exact row count for a table with optional equality filters."""
    try:
        q = supabase.table(table).select("*", count="exact")
        if filters:
            for col, val in filters.items():
                q = q.eq(col, val)
        resp = q.execute()
        return resp.count if resp.count is not None else len(resp.data or [])
    except Exception as e:
        print(f"[stats] count({table}) failed: {e}")
        return 0


@router.get("")
def get_stats(user: dict = Depends(get_current_user)):
    """Dashboard counts + recent 6 shipments. Accessible to all authenticated users."""
    try:
        total_shipments = _count("shipments")
        total_customers = _count("customers")
        staff_count     = _count("profiles", {"role": "staff"})
        pending_do      = _count("shipments", {"do_status": "Pending"})
        completed_do    = _count("shipments", {"do_status": "Completed"})

        recent_resp = (
            supabase.table("shipments")
            .select("id, file_no, eta, do_status, clear_status, progress, created_at, customers(name)")
            .order("created_at", desc=True)
            .limit(6)
            .execute()
        )

        return {
            "total":     total_shipments,
            "customers": total_customers,
            "staff":     staff_count,
            "pending":   pending_do,
            "completed": completed_do,
            "recent":    recent_resp.data or [],
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Stats query failed: {str(e)}")
