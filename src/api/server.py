from flask import Flask, jsonify
from flask_cors import CORS
from src.engine.verification_engine import VerificationEngine
from src.engine.closure_generator import ClosureGenerator

app = Flask(__name__)
CORS(app)

@app.route("/run-demo")
def run_demo():
    riv = VerificationEngine()
    closure = ClosureGenerator()

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

    closure_text = closure.generate_power_cycle_closure(
        rack="H10",
        device="NOMT10TS03B",
        notified_person="Faizan",
        service_restored=True
    )

    return jsonify({
        "report": report,
        "closure": closure_text
    })

if __name__ == "__main__":
    app.run(debug=True)