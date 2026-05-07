from fastapi import FastAPI, Request
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



