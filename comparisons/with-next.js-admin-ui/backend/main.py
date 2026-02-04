from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Literal

from fastapi import FastAPI, Header, HTTPException

app = FastAPI(title="admin-ui-comparison-backend")

DEMO_TOKEN = "demo-token"


def require_auth(authorization: str | None) -> None:
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = authorization.split(" ", maxsplit=1)[1]
    if token != DEMO_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")


now = datetime.now(UTC)

users = [
    {
        "id": "usr_01",
        "name": "Jane Smith",
        "email": "jane.smith@acme.com",
        "role": "Admin",
        "status": "Active",
        "tenant": "Acme Corp",
    },
    {
        "id": "usr_02",
        "name": "Luis Martinez",
        "email": "luis@northwind.io",
        "role": "User",
        "status": "Active",
        "tenant": "Northwind",
    },
    {
        "id": "usr_03",
        "name": "Priya Patel",
        "email": "priya@globex.io",
        "role": "Viewer",
        "status": "Suspended",
        "tenant": "Globex",
    },
    {
        "id": "usr_04",
        "name": "Kenji Tanaka",
        "email": "kenji@umbrella.dev",
        "role": "User",
        "status": "Inactive",
        "tenant": "Umbrella",
    },
]

tenants = [
    {
        "id": "ten_01",
        "name": "Acme Corp",
        "plan": "Enterprise",
        "users": 482,
        "status": "Active",
    },
    {
        "id": "ten_02",
        "name": "Northwind",
        "plan": "Growth",
        "users": 216,
        "status": "Active",
    },
    {
        "id": "ten_03",
        "name": "Globex",
        "plan": "Pro",
        "users": 112,
        "status": "On Hold",
    },
    {
        "id": "ten_04",
        "name": "Umbrella",
        "plan": "Starter",
        "users": 44,
        "status": "Trial",
    },
]

api_keys = [
    {
        "id": "key_01",
        "name": "Production Key",
        "createdBy": "Jane Smith",
        "lastUsed": "2026-02-02",
        "status": "Active",
    },
    {
        "id": "key_02",
        "name": "Staging Key",
        "createdBy": "Luis Martinez",
        "lastUsed": "2026-02-01",
        "status": "Active",
    },
    {
        "id": "key_03",
        "name": "Legacy Key",
        "createdBy": "Priya Patel",
        "lastUsed": "2026-01-24",
        "status": "Revoked",
    },
]

activity: list[dict[str, str | Literal["login", "user_created", "tenant_created", "api_key_created"]]] = [
    {
        "id": "act_01",
        "type": "login",
        "description": "Jane Smith logged in from Berlin",
        "timestamp": (now - timedelta(minutes=14)).isoformat(),
    },
    {
        "id": "act_02",
        "type": "user_created",
        "description": "New user Michael Park added to Acme Corp",
        "timestamp": (now - timedelta(minutes=90)).isoformat(),
    },
    {
        "id": "act_03",
        "type": "tenant_created",
        "description": "Tenant Northwind onboarded",
        "timestamp": (now - timedelta(hours=9)).isoformat(),
    },
    {
        "id": "act_04",
        "type": "api_key_created",
        "description": "API key generated for Omega Labs",
        "timestamp": (now - timedelta(hours=22)).isoformat(),
    },
]


@app.get("/dashboard")
async def get_dashboard(authorization: str | None = Header(default=None)) -> dict:
    require_auth(authorization)
    stats = {
        "totalUsers": len(users),
        "activeUsers": len([user for user in users if user["status"] == "Active"]),
        "totalTenants": len(tenants),
        "totalApiKeys": len(api_keys),
    }
    return {"stats": stats, "activity": activity}


@app.get("/users")
async def get_users(authorization: str | None = Header(default=None)) -> dict:
    require_auth(authorization)
    return {"users": users}


@app.get("/tenants")
async def get_tenants(authorization: str | None = Header(default=None)) -> dict:
    require_auth(authorization)
    return {"tenants": tenants}


@app.get("/api-keys")
async def get_api_keys(authorization: str | None = Header(default=None)) -> dict:
    require_auth(authorization)
    return {"apiKeys": api_keys}
