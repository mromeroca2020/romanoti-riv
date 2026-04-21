from src.engine.verification_engine import VerificationEngine

def run_demo():
    riv = VerificationEngine()

    # Simulación real de tu caso
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

    report = riv.generate_report()
    print(report)


if __name__ == "__main__":
    run_demo()