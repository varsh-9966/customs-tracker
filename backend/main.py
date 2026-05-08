from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware

from routers import shipments, customers, staff, stats

app = FastAPI(
    title="CustomsTracker API",
    description="Backend for the CustomsTracker shipment management system.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(shipments.router)
app.include_router(customers.router)
app.include_router(staff.router)
app.include_router(stats.router)


@app.get("/")
def root():
    return {"status": "CustomsTracker API is running ✅"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/me")
def get_me(user: dict = Depends(__import__("auth").get_current_user)):
    """Return the current user's profile including all permissions."""
    from database import supabase
    resp = (
        supabase.table("profiles")
        .select("id, full_name, role, view_access, enter_access, edit_access, delete_access, created_at")
        .eq("id", user["sub"])
        .maybe_single()
        .execute()
    )
    if not resp.data:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Profile not found.")
    return resp.data
