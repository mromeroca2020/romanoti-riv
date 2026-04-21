class VerificationEngine:
    
    def __init__(self):
        self.checks = []

    def add_check(self, name, result, details=""):
        self.checks.append({
            "name": name,
            "result": result,
            "details": details
        })

    def run(self):
        summary = {
            "total_checks": len(self.checks),
            "passed": 0,
            "failed": 0,
            "details": self.checks
        }

        for check in self.checks:
            if check["result"]:
                summary["passed"] += 1
            else:
                summary["failed"] += 1

        return summary

    def generate_report(self):
        summary = self.run()

        report = "=== RIV Verification Report ===\n"
        report += f"Total checks: {summary['total_checks']}\n"
        report += f"Passed: {summary['passed']}\n"
        report += f"Failed: {summary['failed']}\n\n"

        for check in summary["details"]:
            status = "OK" if check["result"] else "FAIL"
            report += f"[{status}] {check['name']} - {check['details']}\n"

        return report