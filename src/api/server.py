from flask import Flask, jsonify, request
from flask_cors import CORS
from src.engine.verification_engine import VerificationEngine
from src.engine.closure_generator import ClosureGenerator
from src.engine.runbook_generator import RunbookGenerator
from src.engine.ticket_parser import TicketParser
from src.engine.bulk_patch_parser import BulkPatchParser
import os

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

    if service_type == "patch_same_rack":
        riv.add_check(
            name="Same Rack Patch Validation",
            result=True,
            details=f"Same rack patch completed for {device}"
        )
        riv.add_check(
            name="Label Verification",
            result=True,
            details="Source and destination labeling verified"
        )
        riv.add_check(
            name="Link Status",
            result=True,
            details="Link/activity indicators verified"
        )

        report = riv.generate_report()

        closure_text = (
            f"Same-rack patching was completed successfully for device {device} in rack {rack}. "
            f"Labeling and link status were verified. Relevant stakeholder has been informed. Issue resolved."
        )

    elif service_type == "patch_cross_rack":
        source_device = parsed["device_source"]
        dest_device = parsed["device_destination"]
        source_rack = parsed["source_rack"]
        dest_rack = parsed["destination_rack"]
        source_port = parsed["port_source"]
        dest_port = parsed["port_destination"]

        riv.add_check(
            name="Cross Rack Patch Validation",
            result=True,
            details=f"Patch validated between {source_device} and {dest_device}"
        )
        riv.add_check(
            name="Rack Verification",
            result=True,
            details=f"Source rack {source_rack} and destination rack {dest_rack} verified"
        )
        riv.add_check(
            name="Link Status",
            result=True,
            details="Link/activity indicators verified after cross-rack patching"
        )

        report = riv.generate_report()

        closure_text = (
            f"Cross-rack patching was completed successfully from device {source_device} port {source_port} "
            f"in rack {source_rack} to device {dest_device} port {dest_port} in rack {dest_rack}. "
            f"Rack positions and link status were verified. Relevant stakeholder has been informed. Issue resolved."
        )

    elif service_type == "patch_ohu":
        source_device = parsed["device_source"]
        ohu = parsed["overhead_unit"]
        source_port = parsed["port_source"]

        riv.add_check(
            name="OHU Patch Validation",
            result=True,
            details=f"Patch validated from {source_device} port {source_port} to OHU {ohu}"
        )
        riv.add_check(
            name="Pathway Verification",
            result=True,
            details="Overhead pathway verified"
        )
        riv.add_check(
            name="Link Status",
            result=True,
            details="Link/activity indicators verified after OHU patching"
        )

        report = riv.generate_report()

        closure_text = (
            f"Patching to overhead unit was completed successfully from device {source_device} port {source_port} "
            f"to overhead unit {ohu}. Pathway and link status were verified. Relevant stakeholder has been informed. Issue resolved."
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
            notified_person="relevant stakeholder",
            service_restored=True
        )

    elif service_type == "port_validation":
        ports = parsed["ports"]

        riv.add_check(
            name="Port Validation",
            result=True,
            details=f"Port validation completed on device {device} for ports {ports}"
        )
        riv.add_check(
            name="Link Status",
            result=True,
            details="Requested port state verified"
        )
        riv.add_check(
            name="Engineer Confirmation",
            result=True,
            details="Validation confirmed with remote engineer"
        )

        report = riv.generate_report()

        closure_text = (
            f"Port validation was completed successfully on device {device} in rack {rack}. "
            f"Requested ports {ports} were verified and confirmation was obtained. Relevant stakeholder has been informed. Issue resolved."
        )

    elif service_type == "redundant_connectivity":
        source_device = parsed["device_source"]
        dest_device = parsed["device_destination"]
        redundancy_type = parsed["redundancy_type"]

        riv.add_check(
            name="Redundancy Path Validation",
            result=True,
            details=f"Redundant connectivity {redundancy_type} verified between {source_device} and {dest_device}"
        )
        riv.add_check(
            name="Path Integrity",
            result=True,
            details="Primary and secondary paths validated"
        )
        riv.add_check(
            name="Service Continuity",
            result=True,
            details="No service interruption detected during validation"
        )

        report = riv.generate_report()

        closure_text = (
            f"Redundant connectivity validation was completed successfully between device {source_device} and device {dest_device}. "
            f"Redundancy type {redundancy_type} was verified and service continuity was maintained. "
            f"Relevant stakeholder has been informed. Issue resolved."
        )

    elif service_type == "network_device_task":
        riv.add_check(
            name="Network Device Task",
            result=True,
            details=f"Requested task completed on network device {device}"
        )
        riv.add_check(
            name="Operational Validation",
            result=True,
            details="Post-task operational status verified"
        )
        riv.add_check(
            name="Stakeholder Notification",
            result=True,
            details="Relevant stakeholder informed"
        )

        report = riv.generate_report()

        closure_text = (
            f"Network device task was completed successfully on device {device} in rack {rack}. "
            f"Operational validation was performed and the relevant stakeholder was informed. Issue resolved."
        )

    elif service_type == "server_task":
        riv.add_check(
            name="Server Task",
            result=True,
            details=f"Requested task completed on server {device}"
        )
        riv.add_check(
            name="Application / Service Validation",
            result=True,
            details="Post-task validation completed successfully"
        )
        riv.add_check(
            name="Stakeholder Notification",
            result=True,
            details="Relevant stakeholder informed"
        )

        report = riv.generate_report()

        closure_text = (
            f"Server task was completed successfully on device {device} in rack {rack}. "
            f"Post-task validation was completed and the relevant stakeholder was informed. Issue resolved."
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


@app.route("/upload-patch-plan", methods=["POST"])
def upload_patch_plan():
    temp_path = "temp_patch.xlsx"

    try:
        if "file" not in request.files:
            return jsonify({
                "status": "error",
                "error": "No file uploaded"
            }), 400

        file = request.files["file"]

        if file.filename == "":
            return jsonify({
                "status": "error",
                "error": "Empty filename"
            }), 400

        file.save(temp_path)

        parser = BulkPatchParser()
        result = parser.parse_excel(temp_path)

        return jsonify({
            "status": "success",
            "result": result
        })

    except Exception as error:
        return jsonify({
            "status": "error",
            "error": str(error)
        }), 500

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


if __name__ == "__main__":
    app.run(debug=True)