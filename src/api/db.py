"""
Romanoti RIV - Supabase database helper
File: src/api/db.py

Purpose:
- Keep Supabase credentials on the Flask backend only.
- Provide a small dependency-free PostgREST client for RIV API endpoints.
- Do not expose service role keys to the browser.

Required local environment variables:
- RIV_SUPABASE_URL
- RIV_SUPABASE_SERVICE_ROLE_KEY
"""

import json
import os
from typing import Any, Dict, Optional
from urllib import error, parse, request


class SupabaseConfigError(Exception):
    """Raised when Supabase environment variables are missing."""


class SupabaseRequestError(Exception):
    """Raised when Supabase returns an HTTP error."""

    def __init__(self, message: str, status_code: int = 500, details: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.details = details


def get_supabase_config() -> Dict[str, str]:
    """
    Return Supabase backend configuration from environment variables.
    """
    url = os.getenv("RIV_SUPABASE_URL", "").strip().rstrip("/")
    key = os.getenv("RIV_SUPABASE_SERVICE_ROLE_KEY", "").strip()

    if not url or not key:
        raise SupabaseConfigError(
            "Missing RIV_SUPABASE_URL or RIV_SUPABASE_SERVICE_ROLE_KEY environment variable."
        )

    return {
        "url": url,
        "key": key,
    }


def is_supabase_configured() -> bool:
    """
    Quickly check whether the backend has the required Supabase configuration.
    """
    try:
        get_supabase_config()
        return True
    except SupabaseConfigError:
        return False


def _build_rest_url(table_or_path: str, query_params: Optional[Dict[str, Any]] = None) -> str:
    """
    Build a Supabase REST URL for a table or PostgREST path.
    """
    config = get_supabase_config()
    table_or_path = table_or_path.strip().lstrip("/")

    base_url = f"{config['url']}/rest/v1/{table_or_path}"

    if not query_params:
        return base_url

    clean_params = {}
    for key, value in query_params.items():
        if value is None:
            continue
        clean_params[key] = str(value)

    if not clean_params:
        return base_url

    # Keep PostgREST operators readable: select=*, order=name.asc, id=eq.uuid, etc.
    query_string = parse.urlencode(clean_params, safe="*,.():!-_")
    return f"{base_url}?{query_string}"


def supabase_request(
    method: str,
    table_or_path: str,
    query_params: Optional[Dict[str, Any]] = None,
    body: Optional[Any] = None,
    prefer: Optional[str] = None,
) -> Any:
    """
    Execute a Supabase REST request.
    """
    config = get_supabase_config()
    url = _build_rest_url(table_or_path, query_params)

    headers = {
        "apikey": config["key"],
        "Authorization": f"Bearer {config['key']}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    if prefer:
        headers["Prefer"] = prefer

    payload = None
    if body is not None:
        payload = json.dumps(body).encode("utf-8")

    req = request.Request(
        url=url,
        data=payload,
        headers=headers,
        method=method.upper(),
    )

    try:
        with request.urlopen(req, timeout=20) as response:
            raw = response.read().decode("utf-8")
            if not raw:
                return None
            return json.loads(raw)

    except error.HTTPError as exc:
        raw_error = exc.read().decode("utf-8")
        try:
            details = json.loads(raw_error) if raw_error else None
        except json.JSONDecodeError:
            details = raw_error

        raise SupabaseRequestError(
            message=f"Supabase request failed with HTTP {exc.code}.",
            status_code=exc.code,
            details=details,
        ) from exc

    except error.URLError as exc:
        raise SupabaseRequestError(
            message="Could not connect to Supabase REST API.",
            status_code=503,
            details=str(exc),
        ) from exc


def supabase_select(
    table: str,
    select: str = "*",
    filters: Optional[Dict[str, str]] = None,
    order: Optional[str] = None,
    limit: Optional[int] = None,
) -> Any:
    """
    Read rows from a Supabase table using PostgREST query parameters.

    Example:
        supabase_select(
            "riv_devices",
            filters={"rack_id": "eq.123"},
            order="ru_position.desc",
            limit=50,
        )
    """
    params: Dict[str, Any] = {"select": select}

    if filters:
        for column, expression in filters.items():
            if expression is None or expression == "":
                continue
            params[column] = expression

    if order:
        params["order"] = order

    if limit is not None:
        params["limit"] = str(limit)

    return supabase_request("GET", table, query_params=params)


def supabase_insert(table: str, rows: Any) -> Any:
    """
    Insert one row or a list of rows and return the inserted record(s).
    """
    return supabase_request(
        "POST",
        table,
        body=rows,
        prefer="return=representation",
    )
