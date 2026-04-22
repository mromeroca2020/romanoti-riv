class RunbookGenerator:
    def __init__(self):
        pass

    def generate(self, ticket_description: str):
        """
        Generates a simple runbook based on ticket description.
        """

        ticket = ticket_description.lower()

        if "power cycle" in ticket:
            return self._power_cycle_runbook(ticket_description)

        elif "patch" in ticket or "cable" in ticket:
            return self._patch_runbook(ticket_description)

        elif "verify device" in ticket or "rack validation" in ticket:
            return self._rack_validation_runbook(ticket_description)

        else:
            return self._generic_runbook(ticket_description)

    # =========================
    # RUNBOOK TYPES
    # =========================

    def _power_cycle_runbook(self, ticket):
        return [
            "Locate the target rack and device",
            "Confirm device identification with label",
            "Gracefully shut down the device if applicable",
            "Disconnect power cables",
            "Wait 10 seconds",
            "Reconnect power cables",
            "Observe boot sequence",
            "Verify device is operational"
        ]

    def _patch_runbook(self, ticket):
        return [
            "Identify source and destination ports",
            "Locate correct patch panel",
            "Verify cable label",
            "Disconnect existing cable if required",
            "Insert new cable firmly",
            "Check link/activity lights",
            "Validate connectivity with remote team"
        ]

    def _rack_validation_runbook(self, ticket):
        return [
            "Locate rack position",
            "Verify rack ID and labeling",
            "Check device mounting status",
            "Inspect cable organization",
            "Verify power connections",
            "Take validation photos if required",
            "Report discrepancies"
        ]

    def _generic_runbook(self, ticket):
        return [
            "Review ticket details carefully",
            "Locate the target infrastructure",
            "Perform requested operation",
            "Validate outcome",
            "Document results",
            "Notify stakeholder"
        ]