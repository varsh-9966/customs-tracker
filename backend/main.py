from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware

from routers import shipments, customers, staff, stats

import shutil
import os
import base64
try:
    if not os.path.exists("../customs-tracker/public"):
        os.makedirs("../customs-tracker/public", exist_ok=True)
    shutil.copy("../customs-tracker/src/assets/logo.png", "../customs-tracker/public/logo.png")
    
    with open("../customs-tracker/public/logo.png", "rb") as img_file:
        b64_string = base64.b64encode(img_file.read()).decode('utf-8')
        
    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#ffffff" />
  <image href="data:image/png;base64,{b64_string}" x="56" y="56" width="400" height="400" preserveAspectRatio="xMidYMid meet" />
</svg>"""

    with open("../customs-tracker/public/pwa-icon.svg", "w") as f:
        f.write(svg_content)
        
except Exception as e:
    print("Logo copy/SVG failed:", e)

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
