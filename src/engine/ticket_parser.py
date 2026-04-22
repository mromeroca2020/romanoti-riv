import re


class TicketParser:
    def __init__(self):
        pass

    def parse(self, ticket_number="", short_description="", description=""):
        full_text = f"{ticket_number} {short_description} {description}"
        normalized_text = full_text.lower()

        service_type = self._detect_service_type(normalized_text)
        device = self._extract_device(ticket_number, short_description, description)
        rack = self._extract_rack(ticket_number, short_description, description)

        return {
            "ticket_number": ticket_number,
            "short_description": short_description,
            "description": description,
            "service_type": service_type,
            "device": device,
            "rack": rack
        }

    def _detect_service_type(self, text):
        if any(term in text for term in ["power cycle", "power cycling", "reboot", "restart device"]):
            return "power_cycle"

        if any(term in text for term in ["patch", "patching", "patch cable", "cable replace", "replace cable", "cabling"]):
            return "patch_verification"

        if any(term in text for term in ["rack validation", "verify device", "device validation", "rack audit"]):
            return "rack_validation"

        if any(term in text for term in ["rack mount", "mount verification", "mounting check", "device mount"]):
            return "rack_mount_verification"

        if any(term in text for term in ["connectivity test", "connection test", "device connectivity", "network connectivity", "link test"]):
            return "device_connectivity_test"

        return "generic_task"

    def _extract_device(self, ticket_number, short_description, description):
        """
        Prioriza encontrar el hostname/device real en la description.
        Evita confundir ticket IDs y códigos cortos como MT10.
        """
        ignored_prefixes = ["sctask", "screq", "ritm", "inc", "chg", "task"]

        # 1) Buscar primero en la description (más confiable)
        desc_matches = re.findall(r"\b[a-z]{2,}\d+[a-z0-9-]*\b", description.lower())

        # Priorizar nombres más largos / más parecidos a hostname real
        desc_matches = sorted(desc_matches, key=len, reverse=True)

        for match in desc_matches:
            if any(match.startswith(prefix) for prefix in ignored_prefixes):
                continue

            # ignorar códigos demasiado cortos tipo MT10
            if re.fullmatch(r"[a-z]{2}\d{1,2}", match):
                continue

            return match.upper()

        # 2) Si no encontró nada útil en description, buscar en short_description
        short_matches = re.findall(r"\b[a-z]{2,}\d+[a-z0-9-]*\b", short_description.lower())
        short_matches = sorted(short_matches, key=len, reverse=True)

        for match in short_matches:
            if any(match.startswith(prefix) for prefix in ignored_prefixes):
                continue

            if re.fullmatch(r"[a-z]{2}\d{1,2}", match):
                continue

            return match.upper()

        return "UNKNOWN_DEVICE"

    def _extract_rack(self, ticket_number, short_description, description):
        """
        Detecta rack solo si aparece explícito.
        Evita confundir MT10 con rack.
        """
        text = f"{ticket_number} {short_description} {description}"
        lower_text = text.lower()

        # rack H10 / rack: H10
        match = re.search(r"\brack\s*[:\-]?\s*([a-z]\d{1,2})\b", lower_text)
        if match:
            return match.group(1).upper()

        # H10 rack
        match = re.search(r"\b([a-z]\d{1,2})\s+rack\b", lower_text)
        if match:
            return match.group(1).upper()

        # cage H10
        match = re.search(r"\bcage\s*[:\-]?\s*([a-z]\d{1,2})\b", lower_text)
        if match:
            return match.group(1).upper()

        return "UNKNOWN_RACK"