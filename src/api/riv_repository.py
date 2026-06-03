"""
Romanoti RIV - Repository layer
File: src/api/riv_repository.py

Purpose:
- Keep all RIV Supabase table access in one backend layer.
- Expose safe, controlled data actions to Flask endpoints.
- Prepare Rack View, Multi-Rack View, Connectivity Map, Connection Details,
  Smart Hands and Current Tools to read from the dedicated RIV database.

Important design note:
- The RIV database schema is still evolving.
- Some early code ordered tables by columns that do not exist yet
  (for example early/order-only columns that are not part of the live pilot schema).
- This repository now retries safely without ordering when Supabase returns
  a schema-related HTTP 400. This lets the pilot continue while the DB model
  is refined table by table.
"""

from typing import Any, Dict, List, Optional

from src.api.db import (
    SupabaseConfigError,
    SupabaseRequestError,
    supabase_insert,
    supabase_select,
)


# Only these RIV tables can be requested through the repository.
# This prevents a generic endpoint from being used to read unrelated tables.
ALLOWED_TABLES = {
    "riv_companies",
    "riv_data_centers",
    "riv_racks",
    "riv_device_assets",
    "riv_device_asset_ports",
    "riv_devices",
    "riv_device_ports",
    "riv_connectivity_paths",
    "riv_smart_hands_tasks",
}


# Public API resource names mapped to actual Supabase table names.
RESOURCE_TABLE_MAP = {
    "companies": "riv_companies",
    "data-centers": "riv_data_centers",
    "datacenters": "riv_data_centers",
    "racks": "riv_racks",
    "device-assets": "riv_device_assets",
    "device-asset-ports": "riv_device_asset_ports",
    "devices": "riv_devices",
    "device-ports": "riv_device_ports",
    "connectivity-paths": "riv_connectivity_paths",
    "smart-hands-tasks": "riv_smart_hands_tasks",
}


# Query parameters that are allowed to become eq filters.
# Example: /api/riv/devices?rack_id=<uuid>
ALLOWED_FILTERS = {
    "id",
    "company_id",
    "data_center_id",
    "site_id",
    "rack_id",
    "device_id",
    "device_asset_id",
    "path_id",
    "task_id",
    "vendor",
    "model",
    "device_type",
    "status",
    "power_status",
}


# Safe default orders only for tables/columns confirmed by the current pilot data.
# Tables that are still evolving are intentionally left unordered to avoid HTTP 400
# errors caused by missing columns.
DEFAULT_ORDER = {
    "riv_companies": "name.asc",
    "riv_data_centers": "name.asc",
    "riv_racks": "name.asc",
    "riv_device_assets": "vendor.asc,model.asc",
    "riv_smart_hands_tasks": "created_at.desc",
}


# Best-effort local sort preferences. These are applied only when the column exists
# in returned rows, so they are safe during schema changes.
LOCAL_SORT_COLUMNS = {
    "riv_companies": ["name", "legal_name", "created_at"],
    "riv_data_centers": ["name", "code", "created_at"],
    "riv_racks": ["name", "code", "created_at"],
    "riv_device_assets": ["vendor", "model", "display_name", "created_at"],
    "riv_device_asset_ports": ["port_number", "port_name", "name", "created_at"],
    "riv_devices": ["ru_start", "ru", "name", "display_name", "created_at"],
    "riv_device_ports": ["port_number", "port_name", "name", "created_at"],
    "riv_connectivity_paths": ["name", "label", "created_at"],
    "riv_smart_hands_tasks": ["created_at", "title"],
}


def _success(data: Any, message: str = "ok") -> Dict[str, Any]:
    return {
        "success": True,
        "message": message,
        "data": data,
    }


def _failure(message: str, details: Any = None, status_code: int = 500) -> Dict[str, Any]:
    return {
        "success": False,
        "message": message,
        "status_code": status_code,
        "details": details,
    }


def _normalize_action(action: str) -> str:
    return (action or "").strip().lower().replace("_", "-")


def _safe_limit(payload: Optional[Dict[str, Any]], default: int = 100, maximum: int = 500) -> int:
    if not payload:
        return default

    try:
        value = int(payload.get("limit", default))
    except (TypeError, ValueError):
        value = default

    return max(1, min(value, maximum))


def _build_filters(payload: Optional[Dict[str, Any]]) -> Dict[str, str]:
    filters: Dict[str, str] = {}

    if not payload:
        return filters

    for column in ALLOWED_FILTERS:
        value = payload.get(column)
        if value is None or str(value).strip() == "":
            continue
        filters[column] = f"eq.{str(value).strip()}"

    return filters


def _sort_rows_locally(table: str, rows: Any) -> List[Dict[str, Any]]:
    """
    Apply a safe Python-side sort only when possible.

    Supabase ordering is stricter: if the column does not exist, the request fails.
    Python-side sorting avoids that during pilot schema evolution.
    """
    if not isinstance(rows, list):
        return []

    if not rows:
        return []

    sort_columns = LOCAL_SORT_COLUMNS.get(table, [])
    available_column = None

    for column in sort_columns:
        if any(isinstance(row, dict) and column in row for row in rows):
            available_column = column
            break

    if not available_column:
        return rows

    def sort_key(row: Dict[str, Any]) -> str:
        value = row.get(available_column)
        if value is None:
            return ""
        return str(value).lower()

    try:
        return sorted(rows, key=sort_key)
    except Exception:
        return rows


def _select_resilient(
    table: str,
    select: str = "*",
    filters: Optional[Dict[str, str]] = None,
    order: Optional[str] = None,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    """
    Read from Supabase and retry without ordering if a schema/order mismatch occurs.

    This prevents endpoints like /api/riv/devices from failing when the database
    does not yet have an expected ordering column.
    """
    try:
        rows = supabase_select(
            table=table,
            select=select,
            filters=filters or {},
            order=order,
            limit=limit,
        )
        return _sort_rows_locally(table, rows)

    except SupabaseRequestError as exc:
        # The common pilot issue is HTTP 400 caused by ordering on a missing column.
        # Retry safely without order. If it still fails, raise the original error.
        if order and exc.status_code == 400:
            rows = supabase_select(
                table=table,
                select=select,
                filters=filters or {},
                order=None,
                limit=limit,
            )
            return _sort_rows_locally(table, rows)

        raise


def _list_table(table: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if table not in ALLOWED_TABLES:
        return _failure(
            message="Table is not allowed for RIV API access.",
            details={"table": table},
            status_code=403,
        )

    payload = payload or {}
    requested_order = payload.get("order")
    safe_default_order = DEFAULT_ORDER.get(table)

    rows = _select_resilient(
        table=table,
        select="*",
        filters=_build_filters(payload),
        order=requested_order or safe_default_order,
        limit=_safe_limit(payload),
    )

    return _success({
        "table": table,
        "count": len(rows),
        "rows": rows,
    })


def _health() -> Dict[str, Any]:
    sample = _select_resilient(
        table="riv_device_assets",
        select="id",
        limit=1,
    )

    return _success({
        "status": "ok",
        "database": "connected",
        "sample_device_found": bool(sample),
        "tables_checked": ["riv_device_assets"],
    })


def _bootstrap() -> Dict[str, Any]:
    """
    Return a safe initial payload for the RIV frontend.

    This endpoint is useful while the frontend is being moved from static demo data
    to live database data. It reads all core RIV tables, but only inside the
    dedicated RIV table allowlist.
    """
    data: Dict[str, Any] = {}
    errors: Dict[str, Any] = {}

    # Keep a stable order for the JSON output, which helps when testing manually.
    tables_to_load = [
        "riv_companies",
        "riv_data_centers",
        "riv_racks",
        "riv_device_assets",
        "riv_device_asset_ports",
        "riv_devices",
        "riv_device_ports",
        "riv_connectivity_paths",
        "riv_smart_hands_tasks",
    ]

    for table in tables_to_load:
        try:
            response = _list_table(table, {"limit": 500})
            data[table] = response.get("data", {}).get("rows", [])
        except Exception as exc:  # Keep bootstrap resilient during schema evolution.
            data[table] = []
            errors[table] = str(exc)

    return _success({
        "tables": data,
        "errors": errors,
    })


def _device_detail(payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    payload = payload or {}
    device_id = payload.get("device_id") or payload.get("id")

    if not device_id:
        return _failure(
            message="device_id is required.",
            details={"required_parameter": "device_id"},
            status_code=400,
        )

    devices = _select_resilient(
        table="riv_devices",
        select="*",
        filters={"id": f"eq.{device_id}"},
        limit=1,
    )

    if not devices:
        return _failure(
            message="Device was not found.",
            details={"device_id": device_id},
            status_code=404,
        )

    device = devices[0]
    asset = None
    asset_ports = []
    runtime_ports = []

    device_asset_id = device.get("device_asset_id")
    if device_asset_id:
        assets = _select_resilient(
            table="riv_device_assets",
            select="*",
            filters={"id": f"eq.{device_asset_id}"},
            limit=1,
        )
        asset = assets[0] if assets else None

        asset_ports = _select_resilient(
            table="riv_device_asset_ports",
            select="*",
            filters={"device_asset_id": f"eq.{device_asset_id}"},
            limit=500,
        )

    runtime_ports = _select_resilient(
        table="riv_device_ports",
        select="*",
        filters={"device_id": f"eq.{device_id}"},
        limit=500,
    )

    return _success({
        "device": device,
        "asset": asset,
        "asset_ports": asset_ports or [],
        "runtime_ports": runtime_ports or [],
    })


def _create_smart_hands_task(payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Create a Smart Hands task record.

    This is intentionally narrow. The frontend can send a simple JSON payload later.
    """
    payload = payload or {}

    required = ["title"]
    missing = [field for field in required if not payload.get(field)]
    if missing:
        return _failure(
            message="Missing required Smart Hands task fields.",
            details={"missing": missing},
            status_code=400,
        )

    allowed_fields = {
        "title",
        "description",
        "status",
        "priority",
        "rack_id",
        "device_id",
        "path_id",
        "assigned_to",
        "created_by",
        "notes",
    }

    row = {key: value for key, value in payload.items() if key in allowed_fields}
    inserted = supabase_insert("riv_smart_hands_tasks", row)

    return _success({
        "inserted": inserted,
    }, message="Smart Hands task created.")


def repository_response(action: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Main repository dispatcher used by Flask routes.
    """
    try:
        normalized = _normalize_action(action)
        payload = payload or {}

        if normalized == "health":
            return _health()

        if normalized == "bootstrap":
            return _bootstrap()

        if normalized == "device-detail":
            return _device_detail(payload)

        if normalized == "create-smart-hands-task":
            return _create_smart_hands_task(payload)

        if normalized in RESOURCE_TABLE_MAP:
            return _list_table(RESOURCE_TABLE_MAP[normalized], payload)

        if normalized == "table":
            table = payload.get("table")
            return _list_table(table, payload)

        return _failure(
            message="Unknown RIV repository action.",
            details={"action": action},
            status_code=404,
        )

    except SupabaseConfigError as exc:
        return _failure(
            message="Supabase is not configured for RIV.",
            details=str(exc),
            status_code=500,
        )

    except SupabaseRequestError as exc:
        return _failure(
            message=str(exc),
            details=exc.details,
            status_code=exc.status_code,
        )

    except Exception as exc:
        return _failure(
            message="Unexpected RIV repository error.",
            details=str(exc),
            status_code=500,
        )
