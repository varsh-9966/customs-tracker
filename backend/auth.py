"""
auth.py — JWT verification using Supabase JWKS (ES256).

Your Supabase project uses ES256 (asymmetric ECDSA keys).
Verification requires fetching the public key from Supabase's JWKS endpoint:
    {SUPABASE_URL}/auth/v1/.well-known/jwks.json

The private key never leaves Supabase. We only use the public key to VERIFY tokens.
"""

import json
import httpx
import jwt as pyjwt
from jwt.algorithms import ECAlgorithm, RSAAlgorithm
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import SUPABASE_URL

bearer_scheme = HTTPBearer()

# ── JWKS cache ────────────────────────────────────────────────────────────
_jwks_cache: dict = {}   # kid → public key object


def _fetch_jwks() -> list:
    """Fetch the JWKS from Supabase. Returns list of JWK dicts."""
    url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    try:
        resp = httpx.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        print(f"[auth] JWKS fetched — {len(data.get('keys', []))} key(s) found")
        return data.get("keys", [])
    except Exception as e:
        print(f"[auth] Failed to fetch JWKS: {e}")
        return []


def _get_public_key(kid: str, alg: str):
    """
    Return cached public key for the given kid.
    Refreshes from JWKS if not cached yet.
    """
    if kid not in _jwks_cache:
        keys = _fetch_jwks()
        for k in keys:
            k_kid = k.get("kid")
            k_alg = k.get("alg", alg)
            try:
                if k_alg.startswith("ES"):
                    pub = ECAlgorithm.from_jwk(json.dumps(k))
                else:
                    pub = RSAAlgorithm.from_jwk(json.dumps(k))
                _jwks_cache[k_kid] = pub
                print(f"[auth] Cached key kid={k_kid} alg={k_alg}")
            except Exception as e:
                print(f"[auth] Could not load key kid={k_kid}: {e}")

    return _jwks_cache.get(kid)


# ── Core verify function ──────────────────────────────────────────────────
def _decode_token(token: str) -> dict:
    """Verify a Supabase JWT using the JWKS public key."""
    try:
        # Read the JWT header without verifying (to get kid + alg)
        header = pyjwt.get_unverified_header(token)
        kid = header.get("kid")
        alg = header.get("alg", "HS256")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Malformed token header: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if alg == "HS256":
        from config import SUPABASE_JWT_SECRET
        try:
            payload = pyjwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
                leeway=60,
            )
            return payload
        except pyjwt.exceptions.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except pyjwt.exceptions.InvalidTokenError as e:
            print(f"[auth] Token invalid (HS256): {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid authentication token (HS256): {e}",
                headers={"WWW-Authenticate": "Bearer"},
            )

    public_key = _get_public_key(kid, alg)
    if public_key is None:
        # Try refreshing JWKS once (key might have rotated)
        _jwks_cache.clear()
        public_key = _get_public_key(kid, alg)

    if public_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not find matching public key in Supabase JWKS.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = pyjwt.decode(
            token,
            public_key,
            algorithms=[alg],
            options={"verify_aud": False},
            leeway=60,
        )
        return payload
    except pyjwt.exceptions.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except pyjwt.exceptions.InvalidTokenError as e:
        print(f"[auth] Token invalid: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── FastAPI dependencies ──────────────────────────────────────────────────
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    Inject into any route to require a valid Supabase session.
    Returns decoded JWT payload. user['sub'] = Supabase user UUID.
    """
    payload = _decode_token(credentials.credentials)
    if not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Token missing user ID.")
    return payload


def require_founder(user: dict = Depends(get_current_user)) -> dict:
    """
    Inject into founder-only routes.
    Checks the profiles table to confirm role = 'founder'.
    """
    from database import supabase
    profile = (
        supabase.table("profiles")
        .select("role")
        .eq("id", user["sub"])
        .maybe_single()
        .execute()
    )
    if not profile.data or profile.data.get("role") != "founder":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Founder access required.",
        )
    return user


def _get_profile(user_id: str) -> dict:
    """Fetch full profile row for a user."""
    from database import supabase
    resp = (
        supabase.table("profiles")
        .select("role, enter_access, edit_access, delete_access, view_access")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    return resp.data or {}


def require_enter_access(user: dict = Depends(get_current_user)) -> dict:
    """Allow founders always; allow staff only if enter_access=true."""
    profile = _get_profile(user["sub"])
    if profile.get("role") == "founder":
        return user
    if not profile.get("enter_access"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to add shipments.",
        )
    return user


def require_edit_access(user: dict = Depends(get_current_user)) -> dict:
    """Allow founders always; allow staff only if edit_access=true."""
    profile = _get_profile(user["sub"])
    if profile.get("role") == "founder":
        return user
    if not profile.get("edit_access"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to edit shipments.",
        )
    return user


def require_delete_access(user: dict = Depends(get_current_user)) -> dict:
    """Allow founders always; allow staff only if delete_access=true."""
    profile = _get_profile(user["sub"])
    if profile.get("role") == "founder":
        return user
    if not profile.get("delete_access"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete shipments.",
        )
    return user

