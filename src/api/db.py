"""
Romanoti RIV - Supabase Database Client
File: src/api/db.py

Purpose:
- Connect the protected Flask backend to the dedicated RIV Supabase project.
- Keep RIV database configuration separate from CRM configuration.
- Use RIV-specific environment variables only.

Required environment variables:
- RIV_SUPABASE_URL
- RIV_SUPABASE_SERVICE_ROLE_KEY

Important:
- Do not expose the service role key in frontend JavaScript.
- Do not paste the key into ChatGPT.
- This file is backend-only.
"""

import json
import os
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


class RivDatabaseError(Exception):
    """
    Custom error for RIV database operations.
    This keeps API responses clean and easier to troubleshoot.
    """
    pass


class RivSupabaseClient:
    """
    Minimal Supabase REST client for the RIV backend.

    We use the Supabase REST API directly so we do not need to add a new
    Python dependency right now. This keeps the pilot simple and stable.
    """

    def __init__(self):
        self.supabase_url = os.getenv("RIV_SUPABASE_URL", "").strip().rstrip("/")
        self.service_role_key = os.getenv("RIV_SUPABASE_SERVICE_ROLE_KEY", "").strip()

        if not self.supabase_url:
            raise RivDatabaseError("Missing RIV_SUPABASE_URL environment variable.")

        if not self.service_role_key:
            raise RivDatabaseError("Missing RIV_SUPABASE_SERVICE_ROLE_KEY environment variable.")

        self.rest_url = f"{self.supabase_url}/rest/v1"

    def _headers(self) -> Dict[str, str]:
        """
        Build headers required by Supabase REST API.
        """
        return {
            "apikey": self.service_role_key,
            "Authorization": f"Bearer {self.service_role_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Prefer": "return=representation",
        }

    def _request(
        self,
        method: str,
        table: str,
        query_params: Optional[Dict[str, str]] = None,
        payload: Optional[Dict[str, Any]] = None,
    ) -> Any:
        """
        Execute an HTTP request against a Supabase table.
        """
        query_params = query_params or {}

        query_string = urlencode(query_params, doseq=True)
        url = f"{self.rest_url}/{table}"

        if query_string:
            url = f"{url}?{query_string}"

        body = None
        if payload is not None:
            body = json.dumps(payload).encode("utf-8")

        request = Request(
            url=url,
            data=body,
            headers=self._headers(),
            method=method.upper(),
        )

        try:
            with urlopen(request, timeout=20) as response:
                response_body = response.read().decode("utf-8")

                if not response_body:
                    return None

                return json.loads(response_body)

        except HTTPError as error:
            error_body = error.read().decode("utf-8")

            raise RivDatabaseError(
                f"Supabase HTTP error {error.code} on table '{table}': {error_body}"
            )

        except URLError as error:
            raise RivDatabaseError(
                f"Unable to connect to Supabase for table '{table}': {error}"
            )

    def select(
        self,
        table: str,
        select: str = "*",
        filters: Optional[Dict[str, str]] = None,
        order: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Read rows from a Supabase table.

        Example:
        client.select(
            table="riv_devices",
            filters={"rack_id": "eq.some-id"},
            order="name.asc"
        )
        """
        query_params: Dict[str, str] = {
            "select": select,
        }

        if filters:
            query_params.update(filters)

        if order:
            query_params["order"] = order

        if limit:
            query_params["limit"] = str(limit)

        result = self._request(
            method="GET",
            table=table,
            query_params=query_params,
        )

        if result is None:
            return []

        return result

    def insert(
        self,
        table: str,
        payload: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """
        Insert one row into a Supabase table.
        """
        result = self._request(
            method="POST",
            table=table,
            payload=payload,
        )

        if result is None:
            return []

        return result

    def update(
        self,
        table: str,
        filters: Dict[str, str],
        payload: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """
        Update rows in a Supabase table using filters.
        """
        result = self._request(
            method="PATCH",
            table=table,
            query_params=filters,
            payload=payload,
        )

        if result is None:
            return []

        return result


def get_riv_db() -> RivSupabaseClient:
    """
    Factory function used by repositories and API routes.
    """
    return RivSupabaseClient()