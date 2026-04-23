from flask import Flask, jsonify, request
from flask_cors import CORS
from src.engine.verification_engine import VerificationEngine
from src.engine.closure_generator import ClosureGenerator
from src.engine.runbook_generator import RunbookGenerator
from src.engine.ticket_parser import TicketParser

app = Flask(__name__)
CORS(app)


@app.route("/run-demo", methods=["POST"])
def run_demo():
    data = request.get_json() or {}

    ticket_number = data.get("ticket_number", "")
    short_description = data.get("short_description", "")
    description = data.get("description", "")

    parser = TicketParser()
    parsed = parser.parse(ticket_number, short_description, description)

    service_type = parsed["service_type"]
    device = parsed["device_source"]
    rack = parsed["rack"]

    riv = VerificationEngine()
    closure = ClosureGenerator()
    runbook_generator = RunbookGenerator()

    runbook = runbook_generator.generate(service_type, device, rack)

    if service_type == "patch_verification":
        riv.add_check(
            name="Patch Verification",
            result=True,
            details=f"Patch connection verified successfully for {device}"
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
            f"Patch verification was completed successfully for device {device} in rack {rack}. "
            f"Link/activity indicators were confirmed and connectivity validation was successful. "
            f"Relevant stakeholder has been informed. Issue resolved."
        )

    elif service_type == "rack_validation":
        riv.add_check(
            name="Rack Identification",
            result=True,
            details=f"Rack {rack} identified correctly"
        )
        riv.add_check(
            name="Device Validation",
            result=True,
            details=f"Device {device} verified in expected position"
        )
        riv.add_check(
            name="Power Connection Check",
            result=True,
            details="Power connections verified successfully"
        )

        report = riv.generate_report()

        closure_text = (
            f"Rack and device validation was completed successfully for device {device} in rack {rack}. "
            f"Equipment identification, mounting position, and power connections were verified. "
            f"Relevant stakeholder has been informed. Issue resolved."
        )

    elif service_type == "rack_mount_verification":
        riv.add_check(
            name="Rack Unit Placement",
            result=True,
            details=f"Device {device} is installed in the expected rack position"
        )
        riv.add_check(
            name="Mounting Hardware",
            result=True,
            details="Mounting ears and screws are secure"
        )
        riv.add_check(
            name="Physical Stability",
            result=True,
            details="Device is stable and properly aligned"
        )

        report = riv.generate_report()

        closure_text = (
            f"Device rack mount verification was completed successfully for device {device} in rack {rack}. "
            f"Rack unit placement, mounting hardware, and physical stability were verified. "
            f"Relevant stakeholder has been informed. Issue resolved."
        )

    elif service_type == "device_connectivity_test":
        riv.add_check(
            name="Physical Link Check",
            result=True,
            details="Link/activity indicators verified"
        )
        riv.add_check(
            name="Port Verification",
            result=True,
            details="Required ports and cable seating verified"
        )
        riv.add_check(
            name="Connectivity Confirmation",
            result=True,
            details="Connectivity confirmed with remote engineer"
        )

        report = riv.generate_report()

        closure_text = (
            f"Device connectivity test was completed successfully for device {device} in rack {rack}. "
            f"Physical link status, port verification, and connectivity confirmation were completed. "
            f"Relevant stakeholder has been informed. Issue resolved."
        )

    elif service_type == "power_cycle":
        riv.add_check(
            name="Device Power Cycle",
            result=True,
            details=f"Power cycle executed successfully on device {device}"
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
            rack=rack,
            device=device,
            notified_person="Relevant stakeholder",
            service_restored=True
        )

    else:
        riv.add_check(
            name="Task Execution",
            result=True,
            details=f"Task completed for device {device}"
        )
        riv.add_check(
            name="Validation",
            result=True,
            details="Requested validation completed"
        )
        riv.add_check(
            name="Stakeholder Notification",
            result=True,
            details="Relevant stakeholder informed"
        )

        report = riv.generate_report()

        closure_text = (
            f"Requested task was completed successfully for device {device} in rack {rack}. "
            f"Validation was performed and the relevant stakeholder was informed. Issue resolved."
        )

    return jsonify({
        "parsed_ticket": parsed,
        "runbook": runbook,
        "report": report,
        "closure": closure_text
    })


if __name__ == "__main__":
    app.run(debug=True)