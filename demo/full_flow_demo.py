from src.engine.verification_engine import VerificationEngine
from src.engine.closure_generator import ClosureGenerator


def run_full_flow():
    print("=== RIV FULL FLOW DEMO ===\n")

    # Step 1: Initialize engines
    riv = VerificationEngine()
    closure = ClosureGenerator()

    print("Step 1: Running verification checks...\n")

    # Step 2: Simulate real checks
    riv.add_check(
        name="Device Power Cycle",
        result=True,
        details="Power cycle executed successfully on rack H10"
    )

    riv.add_check(
        name="Link Status",
        result=True,
        details="Link/activity lights are active"
    )

    riv.add_check(
        name="Service Access",
        result=True,
        details="User confirmed login and access"
    )

    # Step 3: Generate verification report
    report = riv.generate_report()

    print(report)
    print("\nStep 2: Generating closure...\n")

    # Step 4: Generate closure text
    closure_text = closure.generate_power_cycle_closure(
        rack="H10",
        device="NOMT10TS03B",
        notified_person="Faizan",
        service_restored=True
    )

    print("=== Suggested Ticket Closure ===\n")
    print(closure_text)


if __name__ == "__main__":
    run_full_flow()