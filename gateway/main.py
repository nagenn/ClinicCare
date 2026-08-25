import os

import httpx
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware

SERVICE_MAP = {
    "patients": os.environ.get("PATIENT_SERVICE_URL", "http://localhost:8001"),
    "doctors": os.environ.get("DOCTORS_SERVICE_URL", "http://localhost:8002"),
    "referrals": os.environ.get("REFERRAL_SERVICE_URL", "http://localhost:8003"),
    "documents": os.environ.get("DOCUMENT_SERVICE_URL", "http://localhost:8004"),
    "notifications": os.environ.get("NOTIFICATION_SERVICE_URL", "http://localhost:8005"),
    "labs": os.environ.get("LAB_SERVICE_URL", "http://localhost:8006"),
}

app = FastAPI(title="API Gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = httpx.AsyncClient(timeout=10.0)

HOP_BY_HOP_HEADERS = {"host", "content-length", "connection", "transfer-encoding"}

# Services whose own routes are NOT prefixed with their SERVICE_MAP segment
# (unlike patients/doctors/referrals/documents/notifications, which self-prefix).
UNPREFIXED_SERVICES = {"labs"}


@app.api_route("/api/{full_path:path}", methods=["GET", "POST", "PATCH", "PUT", "DELETE"])
async def proxy(full_path: str, request: Request):
    segment = full_path.split("/", 1)[0]
    base_url = SERVICE_MAP.get(segment)
    if base_url is None:
        raise HTTPException(status_code=404, detail=f"Unknown API route: /api/{full_path}")

    downstream_path = full_path
    if segment in UNPREFIXED_SERVICES:
        downstream_path = full_path[len(segment):].lstrip("/")

    body = await request.body()
    headers = {k: v for k, v in request.headers.items() if k.lower() not in HOP_BY_HOP_HEADERS}

    try:
        upstream = await client.request(
            request.method,
            f"{base_url}/{downstream_path}",
            params=request.query_params,
            content=body,
            headers=headers,
        )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Upstream service '{segment}' unreachable: {exc}") from exc

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        media_type=upstream.headers.get("content-type"),
    )
