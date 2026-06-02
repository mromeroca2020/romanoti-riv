"""
Romanoti RIV - Repository Layer
File: src/api/riv_repository.py

Purpose:
- Centralize all RIV database reads.
- Keep Flask routes clean.
- Prepare RIV for backend/API integration without touching CRM.
- Serve rack, device, asset, port and connectivity data from Supabase.

This repository reads from the dedicated RIV Supabase project using:
- RIV_SUPABASE_URL
- RIV_SUPABASE_SERVICE_ROLE_KEY
"""

from typing import Any, Dict, List, Optional

from src.api.db import get_riv_db, RivDatabaseError


class RivRepository:
    """
    Repository for RIV infrastructure data.
    """

    def __init__(self):
        self.db = get_riv_db()

    def health(self) -> Dict[str, Any]:
        """
        Verify that the backend can reach the RIV Supabase project.
        """
        devices = self.db.select(
            table="riv_devices",
            select="id",
            limit=1,
        )

        return {
            "status": "ok",
            "database": "connected",
            "sample_device_found": len(devices) > 0,
        }

    def get_companies(self) -> List[Dict[str, Any]]:
        """
        Return all companies configured for RIV.
        """
        return self.db.select(
            table="riv_companies",
            select="*",
            order="name.asc",
        )

    def get_data_centers(self, company_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Return data centers. Can be filtered by company_id.
        """
        filters = {}

        if company_id:
            filters["company_id"] = f"eq.{company_id}"

        return self.db.select(
            table="riv_data_centers",
            select="*",
            filters=filters,
            order="name.asc",
        )

    def get_racks(self, data_center_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Return racks. Can be filtered by data_center_id.
        """
        filters = {}

        if data_center_id:
            filters["data_center_id"] = f"eq.{data_center_id}"

        return self.db.select(
            table="riv_racks",
            select="*",
            filters=filters,
            order="name.asc",
        )

    def get_devices(self, rack_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Return installed devices. Can be filtered by rack_id.
        """
        filters = {}

        if rack_id:
            filters["rack_id"] = f"eq.{rack_id}"

        return self.db.select(
            table="riv_devices",
            select="*",
            filters=filters,
            order="ru_position.desc",
        )

    def get_device_assets(self) -> List[Dict[str, Any]]:
        """
        Return device model definitions.

        Example:
        - Cisco Catalyst 9300-24T
        - Fortinet FortiGate 100F
        - Dell PowerEdge R650
        """
        return self.db.select(
            table="riv_device_assets",
            select="*",
            order="vendor.asc",
        )

    def get_device_asset_ports(self, device_asset_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Return expected physical ports for a device model.
        Can be filtered by device_asset_id.
        """
        filters = {}

        if device_asset_id:
            filters["device_asset_id"] = f"eq.{device_asset_id}"

        return self.db.select(
            table="riv_device_asset_ports",
            select="*",
            filters=filters,
            order="port_index.asc",
        )

    def get_device_ports(self, device_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Return ports for an installed device.
        Can be filtered by device_id.
        """
        filters = {}

        if device_id:
            filters["device_id"] = f"eq.{device_id}"

        return self.db.select(
            table="riv_device_ports",
            select="*",
            filters=filters,
            order="port_index.asc",
        )

    def get_connectivity_paths(self, rack_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Return connectivity paths.
        Can be filtered by rack_id.
        """
        filters = {}

        if rack_id:
            filters["rack_id"] = f"eq.{rack_id}"

        return self.db.select(
            table="riv_connectivity_paths",
            select="*",
            filters=filters,
            order="path_label.asc",
        )

    def get_smart_hands_tasks(self) -> List[Dict[str, Any]]:
        """
        Return Smart Hands task records.
        """
        return self.db.select(
            table="riv_smart_hands_tasks",
            select="*",
            order="created_at.desc",
        )

    def get_workspace_payload(self) -> Dict[str, Any]:
        """
        Return the complete initial RIV payload.

        This allows the frontend modules to load from Supabase instead of
        depending only on hardcoded demo data.

        Used by:
        - Rack View
        - Multi-Rack View
        - Connectivity Map
        - Connection Details
        - Smart Hands
        """
        companies = self.get_companies()
        data_centers = self.get_data_centers()
        racks = self.get_racks()
        devices = self.get_devices()
        device_assets = self.get_device_assets()
        device_asset_ports = self.get_device_asset_ports()
        device_ports = self.get_device_ports()
        connectivity_paths = self.get_connectivity_paths()
        smart_hands_tasks = self.get_smart_hands_tasks()

        return {
            "companies": companies,
            "data_centers": data_centers,
            "racks": racks,
            "devices": devices,
            "device_assets": device_assets,
            "device_asset_ports": device_asset_ports,
            "device_ports": device_ports,
            "connectivity_paths": connectivity_paths,
            "smart_hands_tasks": smart_hands_tasks,
        }


def repository_response(method_name: str, *args, **kwargs) -> Dict[str, Any]:
    """
    Helper used by Flask routes.

    It keeps API responses consistent and prevents raw backend errors
    from breaking the frontend.
    """
    try:
        repository = RivRepository()
        method = getattr(repository, method_name)
        data = method(*args, **kwargs)

        return {
            "success": True,
            "data": data,
        }

    except RivDatabaseError as error:
        return {
            "success": False,
            "error": str(error),
        }

    except Exception as error:
        return {
            "success": False,
            "error": f"Unexpected RIV repository error: {error}",
        }