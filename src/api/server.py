from flask import Flask, jsonify, request
from flask_cors import CORS
from src.engine.verification_engine import VerificationEngine
from src.engine.closure_generator import ClosureGenerator
from src.engine.runbook_generator import RunbookGenerator

app = Flask(__name__)
CORS(app)

@app.route("/run-demo", methods=["POST"])
def run_demo():
    data = request.get_json()
    ticket = data.get("ticket", "Power cycle device in rack H10")

    riv = VerificationEngine()
    closure = ClosureGenerator()
    runbook_generator = RunbookGenerator()

    runbook = runbook_generator.generate(ticket)

    ticket_lower = ticket.lower()

    if "patch" in ticket_lower or "cable" in ticket_lower:
        riv.add_check(
            name="Patch Verification",
            result=True,
            details="Patch connection verified successfully"
        )
        riv.add_check(
            name="Link Status",
            result=True,
            details="Link/activity lights are active"
        )
        riv.add_check(
            name="Connectivity Validation",
            result=True,
            details="Remote team confirmed connectivity"
        )

        report = riv.generate_report()

        closure_text = (
            "Patch verification was completed successfully on the requested connection. "
            "Link/activity indicators were confirmed and connectivity validation was successful. "
            "Stakeholder has been informed. Issue resolved."
        )

    elif "verify device" in ticket_lower or "rack validation" in ticket_lower:
        riv.add_check(
            name="Rack Identification",
            result=True,
            details="Rack H10 identified correctly"
        )
        riv.add_check(
            name="Device Validation",
            result=True,
            details="Device labels and mounting position verified"
        )
        riv.add_check(
            name="Power Connection Check",
            result=True,
            details="Power connections verified successfully"
        )

        report = riv.generate_report()

        closure_text = (
            "Rack and device validation was completed successfully. "
            "Equipment identification, mounting position, and power connections were verified. "
            "Stakeholder has been informed. Issue resolved."
        )

    else:
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
        "ticket": ticket,
        "runbook": runbook,
        "report": report,
        "closure": closure_text
    })

if __name__ == "__main__":
    app.run(debug=True)