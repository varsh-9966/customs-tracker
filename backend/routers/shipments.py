import traceback
from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user, require_founder
from database import supabase
from models import ShipmentCreate, ShipmentUpdate

router = APIRouter(prefix="/api/shipments", tags=["Shipments"])


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


@router.get("")
def list_shipments(user: dict = Depends(get_current_user)):
    try:
        result = (
            supabase.table("shipments")
            .select(
                "*, "
                "customers(name), "
                "entered_by_profile:profiles!shipments_entered_by_fkey(full_name), "
                "transport_logs(transport_name, vehicle_no)"
            )
            .order("created_at", desc=True)
            .execute()
        )
        data = []
        for s in (result.data or []):
            s["transport_name"] = (s.get("transport_logs") or [{}])[0].get("transport_name", "")
            s["vehicle_no"]     = (s.get("transport_logs") or [{}])[0].get("vehicle_no", "")
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
            .select("*, customers(name), transport_logs(transport_name, vehicle_no)")
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
def create_shipment(body: ShipmentCreate, user: dict = Depends(get_current_user)):
    try:
        customer_id = _resolve_customer(body.customer_name)

        payload = body.dict(exclude={"customer_name", "transport_name", "vehicle_no"})
        payload = {k: (v if v != "" else None) for k, v in payload.items()}
        payload["customer_id"] = customer_id
        payload["entered_by"]  = user["sub"]

        result = supabase.table("shipments").insert(payload).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create shipment.")

        new_shipment = result.data[0]

        if body.transport_name or body.vehicle_no:
            supabase.table("transport_logs").insert({
                "shipment_id":   new_shipment["id"],
                "transport_name": body.transport_name or None,
                "vehicle_no":    body.vehicle_no or None,
            }).execute()

        return new_shipment
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{shipment_id}")
def update_shipment(shipment_id: str, body: ShipmentUpdate, user: dict = Depends(get_current_user)):
    try:
        update_data = {
            k: v for k, v in body.dict().items()
            if v is not None and k not in ("transport_name", "vehicle_no")
        }
        if update_data:
            supabase.table("shipments").update(update_data).eq("id", shipment_id).execute()

        if body.transport_name is not None or body.vehicle_no is not None:
            existing = (
                supabase.table("transport_logs")
                .select("id")
                .eq("shipment_id", shipment_id)
                .limit(1)
                .execute()
            )
            if existing.data:
                supabase.table("transport_logs").update({
                    "transport_name": body.transport_name,
                    "vehicle_no":     body.vehicle_no,
                }).eq("shipment_id", shipment_id).execute()
            else:
                supabase.table("transport_logs").insert({
                    "shipment_id":    shipment_id,
                    "transport_name": body.transport_name,
                    "vehicle_no":     body.vehicle_no,
                }).execute()

        return {"message": "Shipment updated successfully."}
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{shipment_id}")
def delete_shipment(shipment_id: str, user: dict = Depends(require_founder)):
    supabase.table("transport_logs").delete().eq("shipment_id", shipment_id).execute()
    supabase.table("shipments").delete().eq("id", shipment_id).execute()
    return {"message": "Shipment deleted."}
