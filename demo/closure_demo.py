from src.engine.closure_generator import ClosureGenerator

def run_demo():
    generator = ClosureGenerator()

    closure_text = generator.generate_power_cycle_closure(
        rack="H10",
        device="NOMT10TS03B",
        notified_person="Faizan",
        service_restored=True
    )

    print("=== Suggested Ticket Closure ===")
    print(closure_text)

if __name__ == "__main__":
    run_demo()