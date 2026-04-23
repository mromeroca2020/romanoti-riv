class ClosureGenerator:
    def generate_power_cycle_closure(self, rack, device, notified_person, service_restored=True):
        rack_text = self._format_rack(rack)
        notified_text = self._format_notified_person(notified_person)

        if service_restored:
            return (
                f"Controlled power cycle was performed on the requested device "
                f"{rack_text}. Device {device} is confirmed operational after "
                f"verification checks. {notified_text} Issue resolved."
            )

        return (
            f"Controlled power cycle was performed on the requested device "
            f"{rack_text}. Device {device} is pending final confirmation after "
            f"verification checks. {notified_text} Further validation is required."
        )

    def _format_rack(self, rack):
        if not rack or rack in ["UNKNOWN_RACK", "RACK_NOT_PROVIDED"]:
            return "with rack information not provided in the ticket"
        return f"in rack {rack}"

    def _format_notified_person(self, notified_person):
        if not notified_person:
            return "Relevant stakeholder has been informed."

        value = notified_person.strip().lower()

        if value in ["stakeholder", "relevant stakeholder", "not_provided"]:
            return "Relevant stakeholder has been informed."

        return f"{notified_person} has been informed."