class RunbookGenerator:
    def __init__(self):
        pass

    def generate(self, ticket_description: str):
        ticket = ticket_description.lower()

        if "power cycle" in ticket:
            return self._power_cycle_runbook(ticket_description)

        elif "patch" in ticket or "cable" in ticket:
            return self._patch_runbook(ticket_description)

        elif "verify device" in ticket or "rack validation" in ticket:
            return self._rack_validation_runbook(ticket_description)

        elif "rack mount" in ticket or "mount verification" in ticket:
            return self._rack_mount_runbook(ticket_description)

        elif "connectivity test" in ticket or "connection test" in ticket or "device connectivity" in ticket:
            return self._connectivity_test_runbook(ticket_description)

        else:
            return self._generic_runbook(ticket_description)

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

    def _rack_mount_runbook(self, ticket):
        return [
            "Locate the target rack and device position",
            "Verify rack unit placement",
            "Confirm mounting ears and screws are secured",
            "Check device alignment and physical stability",
            "Verify front and rear clearance",
            "Inspect cable strain and routing",
            "Document rack mount condition"
        ]

    def _connectivity_test_runbook(self, ticket):
        return [
            "Locate the target device",
            "Verify physical link/activity lights",
            "Check cable seating on all required ports",
            "Confirm port status with remote engineer",
            "Perform basic reachability test if applicable",
            "Validate service access or session establishment",
            "Document connectivity results"
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