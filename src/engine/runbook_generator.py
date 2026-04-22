class RunbookGenerator:
    def __init__(self):
        pass

    def generate(self, service_type: str, device="UNKNOWN_DEVICE", rack="UNKNOWN_RACK"):
        if service_type == "power_cycle":
            return self._power_cycle_runbook(device, rack)

        elif service_type == "patch_verification":
            return self._patch_runbook(device, rack)

        elif service_type == "rack_validation":
            return self._rack_validation_runbook(device, rack)

        elif service_type == "rack_mount_verification":
            return self._rack_mount_runbook(device, rack)

        elif service_type == "device_connectivity_test":
            return self._connectivity_test_runbook(device, rack)

        else:
            return self._generic_runbook(device, rack)

    def _power_cycle_runbook(self, device, rack):
        return [
            f"Locate rack {rack} and device {device}",
            "Confirm device identification with label",
            "Gracefully shut down the device if applicable",
            "Disconnect power cables",
            "Wait 10 seconds",
            "Reconnect power cables",
            "Observe boot sequence",
            "Verify device is operational"
        ]

    def _patch_runbook(self, device, rack):
        return [
            f"Locate rack {rack} and associated device {device}",
            "Identify source and destination ports",
            "Locate correct patch panel",
            "Verify cable label",
            "Disconnect existing cable if required",
            "Insert new cable firmly",
            "Check link/activity lights",
            "Validate connectivity with remote team"
        ]

    def _rack_validation_runbook(self, device, rack):
        return [
            f"Locate rack {rack}",
            f"Verify device {device} is present in expected position",
            "Verify rack ID and labeling",
            "Check device mounting status",
            "Inspect cable organization",
            "Verify power connections",
            "Take validation photos if required",
            "Report discrepancies"
        ]

    def _rack_mount_runbook(self, device, rack):
        return [
            f"Locate rack {rack} and device {device}",
            "Verify rack unit placement",
            "Confirm mounting ears and screws are secured",
            "Check device alignment and physical stability",
            "Verify front and rear clearance",
            "Inspect cable strain and routing",
            "Document rack mount condition"
        ]

    def _connectivity_test_runbook(self, device, rack):
        return [
            f"Locate rack {rack} and device {device}",
            "Verify physical link/activity lights",
            "Check cable seating on all required ports",
            "Confirm port status with remote engineer",
            "Perform basic reachability test if applicable",
            "Validate service access or session establishment",
            "Document connectivity results"
        ]

    def _generic_runbook(self, device, rack):
        return [
            "Review ticket details carefully",
            f"Locate rack {rack} and device {device}",
            "Perform requested operation",
            "Validate outcome",
            "Document results",
            "Notify stakeholder"
        ]