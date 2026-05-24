import pandas as pd


class BulkPatchParser:
    def __init__(self):
        self.sfp_rules = {
            "GLC-T": {
                "media": "Copper",
                "connection": "RJ45",
                "speed": "1G",
                "notes": "Copper RJ45 transceiver. Use copper Ethernet cable."
            },
            "SFP-10G-SR": {
                "media": "MM",
                "connection": "LC",
                "speed": "10G",
                "notes": "10G short-range multimode fiber. Use LC-LC multimode fiber."
            },
            "SFP-10G-LR": {
                "media": "SM",
                "connection": "LC",
                "speed": "10G",
                "notes": "10G long-range single-mode fiber. Use LC-LC single-mode fiber."
            },
            "SFP-25G-SR-S": {
                "media": "MM",
                "connection": "LC",
                "speed": "25G",
                "notes": "25G short-range multimode fiber. Use LC-LC multimode fiber."
            },
            "QSFP-40/100-SRBD": {
                "media": "MM",
                "connection": "MPO/LC depending on breakout design",
                "speed": "40G/100G",
                "notes": "QSFP bidirectional short-range optic. Confirm required cable type before patching."
            },
            "QSFP-40G-SR-BD": {
                "media": "MM",
                "connection": "LC",
                "speed": "40G",
                "notes": "40G bidirectional short-range optic. Use multimode fiber and verify compatibility."
            },
            "QSFP-100G-SR1.2": {
                "media": "MM",
                "connection": "MPO",
                "speed": "100G",
                "notes": "100G short-range optic. Use MPO multimode fiber."
            },
            "QSFP+ ADAPTER": {
                "media": "MM",
                "connection": "LC",
                "speed": "100G",
                "notes": "QSFP adapter entry. Confirm optic/module installed and use matching multimode fiber."
            },
            "N/A": {
                "media": "Depends on port type",
                "connection": "Depends on port type",
                "speed": "Not specified",
                "notes": "No transceiver required or not specified. Validate port/cable type manually."
            },
            "NA": {
                "media": "Depends on port type",
                "connection": "Depends on port type",
                "speed": "Not specified",
                "notes": "No transceiver required or not specified. Validate port/cable type manually."
            }
        }

    def parse_excel(self, file_path):
        df = pd.read_excel(file_path)

        df.columns = [str(col).strip() for col in df.columns]

        tasks = []

        for index, row in df.iterrows():
            source_device = self._get(row, ["Source Device Name", "Source Device", "Source"])
            source_port = self._get(row, ["Port", "Source Port"])
            source_rack = self._get(row, ["Source rack", "Source Rack"])
            source_ru = self._get(row, ["RU", "Source RU"])

            target_device = self._get(row, ["Target Device Name", "Destination Device", "Target Device"])
            target_port = self._get(row, ["Target Port", "Port.1", "Target Port "])
            target_rack = self._get(row, ["Target rack", "Target Rack"])
            target_ru = self._get(row, ["RU.1", "Target RU", "Destination RU"])

            sfp_model = self._get(row, ["SFP Model", "SFP", "Transceiver"])
            cable_media = self._get(row, ["Cable Media", "Cable Med", "Media"])
            connection_type = self._get(row, ["Connection Type", "Connector", "Connection"])
            speed = self._get(row, ["Speed"])

            if self._is_empty(source_device) and self._is_empty(target_device):
                continue

            hardware_profile = self._identify_hardware_profile(sfp_model)

            task = {
                "row_number": index + 2,

                "source_device": source_device,
                "source_port": source_port,
                "source_rack": source_rack,
                "source_ru": source_ru,

                "target_device": target_device,
                "target_port": target_port,
                "target_rack": target_rack,
                "target_ru": target_ru,

                "sfp_model": sfp_model,
                "cable_media": cable_media,
                "connection_type": connection_type,
                "speed": speed,

                "hardware_profile": hardware_profile,
                "validation_errors": [],
                "warnings": [],
                "runbook": []
            }

            task["validation_errors"] = self._validate_task(task)
            task["warnings"] = self._generate_warnings(task)
            task["runbook"] = self._generate_runbook(task)

            tasks.append(task)

        return {
            "total_tasks": len(tasks),
            "tasks": tasks
        }

    def _get(self, row, possible_columns):
        for col in possible_columns:
            if col in row:
                value = row.get(col)
                if pd.notna(value):
                    return str(value).strip()
        return "NOT_PROVIDED"

    def _is_empty(self, value):
        return (
            value is None
            or str(value).strip() == ""
            or str(value).strip().upper() in ["NAN", "NONE", "NOT_PROVIDED"]
        )

    def _identify_hardware_profile(self, sfp_model):
        value = str(sfp_model).upper().strip()

        for key, profile in self.sfp_rules.items():
            if key in value:
                return {
                    "detected_model": key,
                    **profile
                }

        return {
            "detected_model": "UNKNOWN",
            "media": "UNKNOWN",
            "connection": "UNKNOWN",
            "speed": "UNKNOWN",
            "notes": "Unknown SFP/transceiver model. Manual validation required."
        }

    def _validate_task(self, task):
        errors = []

        required_fields = [
            ("source_device", "Source device is missing"),
            ("source_port", "Source port is missing"),
            ("target_device", "Target device is missing"),
            ("target_port", "Target port is missing"),
        ]

        for field, message in required_fields:
            if self._is_empty(task.get(field)):
                errors.append(message)

        sfp_model = str(task.get("sfp_model", "")).upper()
        cable_media = str(task.get("cable_media", "")).upper()
        connection_type = str(task.get("connection_type", "")).upper()
        speed = str(task.get("speed", "")).upper()

        if "GLC-T" in sfp_model:
            if "RJ45" not in connection_type:
                errors.append("GLC-T requires RJ45 connection type")
            if "COPPER" not in cable_media and "CAT" not in cable_media:
                errors.append("GLC-T requires copper cable media")

        if "SFP-10G-SR" in sfp_model:
            if "MM" not in cable_media:
                errors.append("SFP-10G-SR requires multimode fiber (MM)")
            if "LC" not in connection_type:
                errors.append("SFP-10G-SR normally requires LC connection")

        if "SFP-10G-LR" in sfp_model:
            if "SM" not in cable_media:
                errors.append("SFP-10G-LR requires single-mode fiber (SM)")
            if "LC" not in connection_type:
                errors.append("SFP-10G-LR normally requires LC connection")

        if "QSFP" in sfp_model:
            if "40G" not in speed and "100G" not in speed:
                errors.append("QSFP optics normally require 40G or 100G speed validation")

        return errors

    def _generate_warnings(self, task):
        warnings = []

        source_port = str(task.get("source_port", "")).lower()
        target_port = str(task.get("target_port", "")).lower()
        sfp_model = str(task.get("sfp_model", "")).upper()

        if "mgmt" in source_port or "mgmt" in target_port:
            warnings.append("Management port detected. Use copper/RJ45 path unless ticket states otherwise.")

        if "console" in source_port or "console" in target_port:
            warnings.append("Console port detected. Validate console cable requirements before patching.")

        if sfp_model in ["N/A", "NA", "NOT_PROVIDED"]:
            warnings.append("No SFP model provided. Confirm cable type manually before execution.")

        if task["hardware_profile"]["detected_model"] == "UNKNOWN":
            warnings.append("Unknown transceiver model. Manual compatibility check required.")

        return warnings

    def _generate_runbook(self, task):
        hp = task["hardware_profile"]

        return [
            f"Review Excel row {task['row_number']} before starting.",
            f"Locate source rack {task['source_rack']} and RU {task['source_ru']}.",
            f"Identify source device {task['source_device']}.",
            f"Locate source port {task['source_port']}.",
            f"Locate target rack {task['target_rack']} and RU {task['target_ru']}.",
            f"Identify target device {task['target_device']}.",
            f"Locate target port {task['target_port']}.",
            f"Confirm transceiver/SFP model: {task['sfp_model']}.",
            f"Expected hardware profile: {hp['detected_model']} | Media: {hp['media']} | Connector: {hp['connection']} | Speed: {hp['speed']}.",
            f"Select correct cable media: {task['cable_media']}.",
            f"Select correct connection type: {task['connection_type']}.",
            "Clean fiber connectors if fiber is used.",
            "Insert or verify transceiver/module on source side if required.",
            "Insert or verify transceiver/module on target side if required.",
            "Connect cable from source port to target port.",
            "Route cable through proper cable management path.",
            "Verify link/activity LEDs on both ends.",
            "Confirm expected speed and port status with remote engineer.",
            "Document completion, exceptions, and any mismatches found."
        ]