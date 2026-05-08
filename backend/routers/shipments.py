import traceback
import uuid as _uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from auth import (
    get_current_user,
    require_enter_access,
    require_edit_access,
    require_delete_access,
)
from database import supabase
from models import ShipmentCreate, ShipmentUpdate

router = APIRouter(prefix="/api/shipments", tags=["Shipments"])


# ── Helpers ────────────────────────────────────────────────────────────────

def _is_valid_uuid(val: str) -> bool:
    try:
        if not val: return False
        _uuid.UUID(str(val))
        return True
    except:
        return False


def _resolve_customer(customer_name: str) -> str:
    """Get existing customer id or create a new one."""
    resp = (
        supabase.table("customers")
        .select("id")
        .ilike("name", customer_name.strip())
        .limit(1)
        .execute()
    )
    if resp.data:
        return resp.data[0]["id"]

    created = supabase.table("customers").insert({"name": customer_name.strip()}).execute()
    if not created.data:
        raise HTTPException(status_code=500, detail="Failed to create customer.")
    return created.data[0]["id"]


def _resolve_handled_by(value: Optional[str]) -> Optional[str]:
    if not value or value.strip() == "":
        return None
    if _is_valid_uuid(value):
        return value
    try:
        resp = (
            supabase.table("profiles")
            .select("id")
            .ilike("full_name", value.strip())
            .limit(1)
            .execute()
        )
        if resp.data:
            return resp.data[0]["id"]
    except:
        pass
    return value.strip()


# ── Routes ─────────────────────────────────────────────────────────────────

@router.get("")
def list_shipments(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    try:
        # Fetch data without complex joins to prevent 500 errors
        q = (
            supabase.table("shipments")
            .select("*, customers(name)")
            .order("created_at", desc=True)
        )
        if status:
            q = q.or_(f"do_status.eq.{status},clear_status.eq.{status}")

        result = q.execute()
        raw_data = result.data or []
        
        # Batch resolve names for display
        h_ids = {s["handled_by"] for s in raw_data if s.get("handled_by") and _is_valid_uuid(s["handled_by"])}
        e_ids = {s["entered_by"] for s in raw_data if s.get("entered_by") and _is_valid_uuid(s["entered_by"])}
        all_ids = h_ids | e_ids
        
        profile_map = {}
        if all_ids:
            p_resp = supabase.table("profiles").select("id, full_name").in_("id", list(all_ids)).execute()
            profile_map = {p["id"]: p["full_name"] for p in (p_resp.data or [])}

        data = []
        for s in raw_data:
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
            if e_val:
                s["entered_by_profile"] = {"full_name": profile_map.get(e_val, "Founder")}
            else:
                s["entered_by_profile"] = {"full_name": "Founder"}

            # Transport logs (minimal separate query for now to be safe, or just skip if not needed)
            # For now, let's just make sure it doesn't crash.
            s["transport_name"] = ""
            s["vehicle_no"] = ""
            
            data.append(s)
        return data
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{shipment_id}")
def get_shipment(shipment_id: str, user: dict = Depends(get_current_user)):
    try:
        result = (
            supabase.table("shipments")
            .select("*, customers(name)")
            .eq("id", shipment_id)
            .limit(1)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Shipment not found.")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", status_code=201)
def create_shipment(body: ShipmentCreate, user: dict = Depends(require_enter_access)):
    try:
        customer_id = _resolve_customer(body.customer_name)
        payload = body.dict(exclude={"customer_name", "transport_name", "vehicle_no"})
        payload = {k: (v if v != "" else None) for k, v in payload.items()}
        payload["customer_id"] = customer_id
        payload["entered_by"]  = user["sub"]
        payload["handled_by"] = _resolve_handled_by(payload.get("handled_by"))

        result = supabase.table("shipments").insert(payload).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create shipment.")

        new_shipment = result.data[0]
        if body.transport_name or body.vehicle_no:
            supabase.table("transport_logs").insert({
                "shipment_id":    new_shipment["id"],
                "transport_name": body.transport_name or None,
                "vehicle_no":     body.vehicle_no or None,
            }).execute()

        return new_shipment
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{shipment_id}")
def update_shipment(shipment_id: str, body: ShipmentUpdate, user: dict = Depends(require_edit_access)):
    try:
        update_data = {
            k: v for k, v in body.dict().items()
            if v is not None and k not in ("transport_name", "vehicle_no")
        }
        if "handled_by" in update_data:
            update_data["handled_by"] = _resolve_handled_by(update_data["handled_by"])

        if update_data:
            supabase.table("shipments").update(update_data).eq("id", shipment_id).execute()

        if body.transport_name is not None or body.vehicle_no is not None:
            supabase.table("transport_logs").upsert({
                "shipment_id":    shipment_id,
                "transport_name": body.transport_name,
                "vehicle_no":     body.vehicle_no,
            }, on_conflict="shipment_id").execute()

        return {"message": "Shipment updated successfully."}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{shipment_id}")
def delete_shipment(shipment_id: str, user: dict = Depends(require_delete_access)):
    supabase.table("transport_logs").delete().eq("shipment_id", shipment_id).execute()
    supabase.table("shipments").delete().eq("id", shipment_id).execute()
    return {"message": "Shipment deleted."}
