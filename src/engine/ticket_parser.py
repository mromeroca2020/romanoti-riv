import re


class TicketParser:
    def __init__(self):
        pass

    def parse(self, ticket_number="", short_description="", description=""):
        text = f"{ticket_number} {short_description} {description}".lower()

        service_type = self._detect_service_type(short_description, description)

        return {
            "ticket_number": ticket_number or "TICKET_NOT_PROVIDED",
            "short_description": short_description or "SHORT_DESCRIPTION_NOT_PROVIDED",
            "description": description or "DESCRIPTION_NOT_PROVIDED",

            "service_type": service_type,

            "site_code": self._extract_site_code(description),
            "data_center": self._extract_site_code(description),

            "rack": self._extract_rack(description),
            "source_rack": self._extract_named_rack(description, "source"),
            "destination_rack": self._extract_named_rack(description, "destination"),

            "ru_source": self._extract_named_ru(description, "source"),
            "ru_destination": self._extract_named_ru(description, "destination"),

            "device_source": self._extract_named_device(description, "source"),
            "device_destination": self._extract_named_device(description, "destination"),

            "device_type": self._detect_device_type(text),

            "working_with_engineer": self._extract_engineer(description),
            "assigned_engineer": "ENGINEER_NOT_PROVIDED",
            "reporting_manager": "MANAGER_NOT_PROVIDED",

            "redundancy_required": self._detect_redundancy(text),
            "redundancy_type": self._detect_redundancy_type(text),

            "overhead_unit": self._extract_ohu(description),

            "port_source": self._extract_named_port(description, "source"),
            "port_destination": self._extract_named_port(description, "destination"),
            "ports": self._extract_ports(description),

            "task_details": self._extract_task_details(short_description, description),
        }

    def _detect_service_type(self, short_description, description):
        sd = (short_description or "").lower().strip()
        desc = (description or "").lower()

        known_types = {
            "patch_same_rack",
            "patch_cross_rack",
            "patch_ohu",
            "power_cycle",
            "port_validation",
            "redundant_connectivity",
            "network_device_task",
            "server_task",
        }

        if sd in known_types:
            return sd

        if "power cycle" in desc or "power cycling" in desc or "reboot" in desc:
            return "power_cycle"

        if "overhead unit" in desc or "ohu" in desc:
            return "patch_ohu"

        if "redundant" in desc or "a/b" in desc:
            return "redundant_connectivity"

        if "patch" in desc and "same rack" in desc:
            return "patch_same_rack"

        if "patch" in desc and ("source rack" in desc or "destination rack" in desc):
            return "patch_cross_rack"

        if "patch" in desc or "cable" in desc:
            return "patch_cross_rack"

        if "port validation" in desc or "validate ports" in desc:
            return "port_validation"

        if "server task" in desc:
            return "server_task"

        if "network device task" in desc:
            return "network_device_task"

        return "generic_task"

    def _extract_site_code(self, description):
        text = description.lower()

        # Evita confundir RU22 con site code
        candidates = re.findall(r"\b[a-z]{2}\d{1,2}\b", text)

        for candidate in candidates:
            if candidate.startswith("ru"):
                continue
            return candidate.upper()

        return "SITE_NOT_PROVIDED"

    def _extract_rack(self, description):
        text = description.lower()

        match = re.search(r"\brack\s+([a-z]?\d{1,3})\b", text)
        if match:
            return match.group(1).upper()

        return "RACK_NOT_PROVIDED"

    def _extract_named_rack(self, description, kind):
        text = description.lower()

        if kind == "source":
            patterns = [
                r"\bfrom\s+[a-z0-9-]+\s+port\s+[a-z0-9\/\.-]+\s+in rack\s+([a-z]?\d{1,3})\b",
                r"\bsource rack\s+([a-z]?\d{1,3})\b",
            ]
        else:
            patterns = [
                r"\bto\s+[a-z0-9-]+\s+port\s+[a-z0-9\/\.-]+\s+in rack\s+([a-z]?\d{1,3})\b",
                r"\bdestination rack\s+([a-z]?\d{1,3})\b",
            ]

        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1).upper()

        return "RACK_NOT_PROVIDED"

    def _extract_named_ru(self, description, kind):
        text = description.lower()

        if kind == "source":
            patterns = [
                r"\bfrom\s+[a-z0-9-]+\s+port\s+[a-z0-9\/\.-]+\s+in rack\s+[a-z]?\d{1,3}\s+(ru?\d{1,2})\b",
                r"\bsource ru\s+(ru?\d{1,2})\b",
            ]
        else:
            patterns = [
                r"\bto\s+[a-z0-9-]+\s+port\s+[a-z0-9\/\.-]+\s+in rack\s+[a-z]?\d{1,3}\s+(ru?\d{1,2})\b",
                r"\bdestination ru\s+(ru?\d{1,2})\b",
            ]

        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                value = match.group(1).upper()
                if value.startswith("RU"):
                    return value
                return f"RU{value}"

        return "RU_NOT_PROVIDED"

    def _extract_named_device(self, description, kind):
        text = description.lower()

        if kind == "source":
            patterns = [
                r"\bfrom\s+([a-z0-9-]+)\s+port\b",
                r"\bsource device\s+([a-z0-9-]+)\b",
                r"\bpower cycling(?: device)?\s+([a-z0-9-]+)\b",
                r"\bpower cycle(?: device)?\s+([a-z0-9-]+)\b",
                r"\breboot(?:ing)?(?: device)?\s+([a-z0-9-]+)\b",
                r"\bdevice\s+([a-z0-9-]+)\b",
            ]
        else:
            patterns = [
                r"\bto\s+([a-z0-9-]+)\s+port\b",
                r"\bdestination device\s+([a-z0-9-]+)\b",
            ]

        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1).upper()

        return "DEVICE_NOT_PROVIDED"

    def _extract_named_port(self, description, kind):
        text = description.lower()

        if kind == "source":
            patterns = [
                r"\bfrom\s+[a-z0-9-]+\s+port\s+([a-z0-9\/\.-]+)\b",
                r"\bsource port\s+([a-z0-9\/\.-]+)\b",
            ]
        else:
            patterns = [
                r"\bto\s+[a-z0-9-]+\s+port\s+([a-z0-9\/\.-]+)\b",
                r"\bdestination port\s+([a-z0-9\/\.-]+)\b",
            ]

        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1).upper()

        return "PORT_NOT_PROVIDED"

    def _extract_ports(self, description):
        text = description.lower()

        match = re.search(r"\bports?\s+([a-z0-9\/\.,\s-]+)", text)
        if match:
            return match.group(1).upper().strip()

        return "PORTS_NOT_PROVIDED"

    def _extract_ohu(self, description):
        text = description.lower()

        match = re.search(r"\b(overhead unit|ohu)\s+([a-z0-9-]+)\b", text)
        if match:
            return match.group(2).upper()

        return "OHU_NOT_PROVIDED"

    def _detect_device_type(self, text):
        if "terminal server" in text:
            return "terminal_server"

        if "firewall" in text or "switch" in text or "router" in text or "network device" in text:
            return "network_device"

        if "server" in text or "apps server" in text:
            return "server"

        return "unknown_device_type"

    def _extract_engineer(self, description):
        match = re.search(r"\bwork with ([a-z]+)\b", description.lower())
        if match:
            return match.group(1).capitalize()

        return "ENGINEER_NOT_PROVIDED"

    def _detect_redundancy(self, text):
        return any(
            term in text
            for term in ["redundant", "a/b", "dual feed", "primary", "secondary"]
        )

    def _detect_redundancy_type(self, text):
        if "a/b" in text:
            return "A/B"

        if "primary" in text and "secondary" in text:
            return "PRIMARY/SECONDARY"

        if "dual feed" in text:
            return "DUAL_FEED"

        return "NOT_DEFINED"

    def _extract_task_details(self, short_description, description):
        if description and description.strip():
            return description.strip()

        return short_description.strip() if short_description else "TASK_DETAILS_NOT_PROVIDED"