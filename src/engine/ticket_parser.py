import re


class TicketParser:
    def __init__(self):
        pass

    def parse(self, ticket_number="", short_description="", description=""):
        full_text = f"{ticket_number} {short_description} {description}".lower()

        service_type = self._detect_service_type(full_text)
        device = self._extract_device(full_text)
        rack = self._extract_rack(full_text)

        return {
            "ticket_number": ticket_number,
            "short_description": short_description,
            "description": description,
            "service_type": service_type,
            "device": device,
            "rack": rack
        }

    def _detect_service_type(self, text):
        if "power cycle" in text or "power cycling" in text or "reboot" in text:
            return "power_cycle"

        if "patch" in text or "cable" in text:
            return "patch_verification"

        if "rack validation" in text or "verify device" in text:
            return "rack_validation"

        if "rack mount" in text or "mount verification" in text:
            return "rack_mount_verification"

        if "connectivity test" in text or "connection test" in text or "device connectivity" in text:
            return "device_connectivity_test"

        return "generic_task"

    def _extract_device(self, text):
        # Busca patrones comunes tipo nomt10ts03b o similares
        match = re.search(r"\b[a-z]{2,}\d+[a-z0-9-]*\b", text)
        if match:
            return match.group(0).upper()
        return "UNKNOWN_DEVICE"

    def _extract_rack(self, text):
        # Busca patrones tipo H10, E01, G12, etc.
        match = re.search(r"\b[a-z]\d{1,2}\b", text)
        if match:
            return match.group(0).upper()
        return "UNKNOWN_RACK"