from pydantic import BaseModel
from typing import Optional


# ── Shipments ──────────────────────────────────────────────
class ShipmentCreate(BaseModel):
    file_no: str
    customer_name: str          # resolved to customer_id server-side
    eta: Optional[str] = None
    containers: Optional[str] = None
    container_type: Optional[str] = None
    qty: Optional[str] = None
    bl_no: Optional[str] = None
    docs_received: Optional[bool] = None
    docs_date: Optional[str] = None
    clear_mode: Optional[str] = None
    be_filed_date: Optional[str] = None
    clear_status: Optional[str] = None
    clear_status_date: Optional[str] = None
    do_status: Optional[str] = None
    do_date: Optional[str] = None
    delivery_type: Optional[str] = None
    factory_delivered: Optional[str] = None
    empty_returned: Optional[str] = None
    billed_date: Optional[str] = None
    progress: Optional[str] = None
    remarks: Optional[str] = None
    be_no: Optional[str] = None
    be_date: Optional[str] = None
    handled_by: Optional[str] = None
    # Transport (stored in transport_logs table)
    transport_name: Optional[str] = None
    vehicle_no: Optional[str] = None


class ShipmentUpdate(BaseModel):
    eta: Optional[str] = None
    containers: Optional[str] = None
    container_type: Optional[str] = None
    qty: Optional[str] = None
    bl_no: Optional[str] = None
    docs_received: Optional[bool] = None
    docs_date: Optional[str] = None
    clear_mode: Optional[str] = None
    be_filed_date: Optional[str] = None
    clear_status: Optional[str] = None
    clear_status_date: Optional[str] = None
    do_status: Optional[str] = None
    do_date: Optional[str] = None
    delivery_type: Optional[str] = None
    factory_delivered: Optional[str] = None
    empty_returned: Optional[str] = None
    billed_date: Optional[str] = None
    progress: Optional[str] = None
    remarks: Optional[str] = None
    be_no: Optional[str] = None
    be_date: Optional[str] = None
    handled_by: Optional[str] = None
    transport_name: Optional[str] = None
    vehicle_no: Optional[str] = None


# ── Customers ──────────────────────────────────────────────
class CustomerCreate(BaseModel):
    name: str


# ── Staff ──────────────────────────────────────────────────
class StaffCreate(BaseModel):
    full_name: str
    email: str
    password: str
