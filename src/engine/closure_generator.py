class ClosureGenerator:
    
    def generate_power_cycle_closure(self, rack, device, notified_person, service_restored=True):
        if service_restored:
            return (
                f"Controlled power cycle was performed on the requested device "
                f"in rack {rack}. Device {device} is confirmed operational after "
                f"verification checks. Stakeholder {notified_person} has been informed. "
                f"Issue resolved."
            )
        else:
            return (
                f"Controlled power cycle was performed on the requested device "
                f"in rack {rack}. Device {device} shows partial recovery or is still "
                f"pending final confirmation. Stakeholder {notified_person} has been informed. "
                f"Further validation is required."
            )