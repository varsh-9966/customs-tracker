import traceback
from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user
from database import supabase
from typing import Optional
from datetime import datetime, timedelta
import uuid as _uuid

router = APIRouter(prefix="/api/stats", tags=["Stats"])

def _is_valid_uuid(val: str) -> bool:
    try:
        if not val: return False
        _uuid.UUID(str(val))
        return True
    except:
        return False

def _count(table: str, filters: dict = None, after_date: str = None) -> int:
    try:
        q = supabase.table(table).select("id", count="exact")
        if filters:
            for col, val in filters.items():
                q = q.eq(col, val)
        if after_date:
            q = q.gte("created_at", after_date)
        resp = q.limit(1).execute()
        return resp.count if resp.count is not None else 0
    except Exception as e:
        print(f"[stats] count error: {e}")
        return 0

@router.get("")
def get_stats(period: Optional[str] = "all", user: dict = Depends(get_current_user)):
    try:
        after_date = None
        if period == "week":
            after_date = (datetime.utcnow() - timedelta(days=7)).isoformat()
        elif period == "month":
            after_date = (datetime.utcnow() - timedelta(days=30)).isoformat()

        # Simplified counts
        total_shipments = _count("shipments", after_date=after_date)
        total_customers = _count("customers", after_date=after_date)
        staff_count     = _count("profiles", {"role": "staff"})
        pending_do      = _count("shipments", {"do_status": "Pending"}, after_date=after_date)
        completed_do    = _count("shipments", {"do_status": "Completed"}, after_date=after_date)

        # Recent shipments with minimal fields to avoid join issues
        q = (
            supabase.table("shipments")
            .select("id, file_no, eta, do_status, clear_status, progress, created_at, handled_by, entered_by, customers(name)")
            .order("created_at", desc=True)
            .limit(6)
        )
        if after_date:
            q = q.gte("created_at", after_date)
        
        recent_resp = q.execute()
        raw_recent = recent_resp.data or []
        
        # Batch resolve names for display
        h_ids = {s["handled_by"] for s in raw_recent if s.get("handled_by") and _is_valid_uuid(s["handled_by"])}
        e_ids = {s["entered_by"] for s in raw_recent if s.get("entered_by") and _is_valid_uuid(s["entered_by"])}
        all_ids = h_ids | e_ids

        profile_map = {}
        if all_ids:
            p_resp = supabase.table("profiles").select("id, full_name").in_("id", list(all_ids)).execute()
            profile_map = {p["id"]: p["full_name"] for p in (p_resp.data or [])}

        recent_data = []
        for s in raw_recent:
            # Resolve Handled By
            h_val = s.get("handled_by")
            if h_val:
                if _is_valid_uuid(h_val):
                    s["handled_by_name"] = profile_map.get(h_val, h_val)
                else:
                    s["handled_by_name"] = h_val
            else:
                s["handled_by_name"] = ""

            # Resolve Entered By
            e_val = s.get("entered_by")
            s["entered_by_profile"] = {"full_name": profile_map.get(e_val, "Founder") if e_val else "Founder"}
            
            recent_data.append(s)

        return {
            "total":     total_shipments,
            "customers": total_customers,
            "staff":     staff_count,
            "pending":   pending_do,
            "completed": completed_do,
            "recent":    recent_data,
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/advanced")
def get_advanced_stats(user: dict = Depends(get_current_user)):
    try:
        resp = supabase.table("shipments").select("containers, clear_mode, clear_status, customers(name)").execute()
        data = resp.data or []
        
        cust_map = {}
        mode_map = {}
        stat_map = {}
        import re
        teu_regex = re.compile(r'(\d+)')

        for s in data:
            cname = (s.get("customers") or {}).get("name", "Unknown")
            try:
                match = teu_regex.search(str(s.get("containers", "0")))
                count = int(match.group(1)) if match else 1
            except: count = 1
            cust_map[cname] = cust_map.get(cname, 0) + count
            m = s.get("clear_mode") or "Not Set"
            mode_map[m] = mode_map.get(m, 0) + 1
            st = s.get("clear_status") or "Pending"
            stat_map[st] = stat_map.get(st, 0) + 1

        customer_volumes = sorted([{"name": k, "value": v} for k, v in cust_map.items()], key=lambda x: x["value"], reverse=True)[:10]

        return {
            "customerVolumes": customer_volumes,
            "clearanceModes": [{"name": k, "value": v} for k, v in mode_map.items()],
            "statusDistribution": [{"name": k, "value": v} for k, v in stat_map.items()]
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
