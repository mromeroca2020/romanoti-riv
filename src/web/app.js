const serviceType = document.getElementById("serviceType");
const ticketNumber = document.getElementById("ticketNumber");
const dynamicFields = document.getElementById("dynamicFields");
const generatedDescription = document.getElementById("generatedDescription");
const analyzeBtn = document.getElementById("analyzeBtn");

const parsedOutput = document.getElementById("parsedOutput");
const reportOutput = document.getElementById("reportOutput");
const runbookOutput = document.getElementById("runbookOutput");
const closureOutput = document.getElementById("closureOutput");

function buildFields(type) {
  const templates = {
    patch_same_rack: `
      <label><strong>Source Device</strong></label>
      <input id="sourceDevice" type="text" placeholder="e.g. NOMT10SW01" />
      <br /><br />
      <label><strong>Source Port</strong></label>
      <input id="sourcePort" type="text" placeholder="e.g. Gi1/0/24" />
      <br /><br />
      <label><strong>Destination Device</strong></label>
      <input id="destinationDevice" type="text" placeholder="e.g. NOMT10FW01" />
      <br /><br />
      <label><strong>Destination Port</strong></label>
      <input id="destinationPort" type="text" placeholder="e.g. Eth1/3" />
      <br /><br />
      <label><strong>Rack</strong></label>
      <input id="rack" type="text" placeholder="e.g. H10" />
      <br /><br />
      <label><strong>RU Source</strong></label>
      <input id="ruSource" type="text" placeholder="e.g. RU18" />
      <br /><br />
      <label><strong>RU Destination</strong></label>
      <input id="ruDestination" type="text" placeholder="e.g. RU20" />
      <br /><br />
    `,
    patch_cross_rack: `
      <label><strong>Source Device</strong></label>
      <input id="sourceDevice" type="text" />
      <br /><br />
      <label><strong>Source Port</strong></label>
      <input id="sourcePort" type="text" />
      <br /><br />
      <label><strong>Source Rack</strong></label>
      <input id="sourceRack" type="text" placeholder="e.g. H10" />
      <br /><br />
      <label><strong>Source RU</strong></label>
      <input id="ruSource" type="text" placeholder="e.g. RU18" />
      <br /><br />
      <label><strong>Destination Device</strong></label>
      <input id="destinationDevice" type="text" />
      <br /><br />
      <label><strong>Destination Port</strong></label>
      <input id="destinationPort" type="text" />
      <br /><br />
      <label><strong>Destination Rack</strong></label>
      <input id="destinationRack" type="text" placeholder="e.g. J12" />
      <br /><br />
      <label><strong>Destination RU</strong></label>
      <input id="ruDestination" type="text" placeholder="e.g. RU22" />
      <br /><br />
    `,
    patch_ohu: `
      <label><strong>Source Device</strong></label>
      <input id="sourceDevice" type="text" />
      <br /><br />
      <label><strong>Source Port</strong></label>
      <input id="sourcePort" type="text" />
      <br /><br />
      <label><strong>Rack</strong></label>
      <input id="rack" type="text" placeholder="e.g. H10" />
      <br /><br />
      <label><strong>RU Source</strong></label>
      <input id="ruSource" type="text" placeholder="e.g. RU18" />
      <br /><br />
      <label><strong>Overhead Unit</strong></label>
      <input id="ohu" type="text" placeholder="e.g. OHU-A1" />
      <br /><br />
      <label><strong>Destination Port / Panel Position</strong></label>
      <input id="destinationPort" type="text" placeholder="e.g. Port 12" />
      <br /><br />
    `,
    power_cycle: `
      <label><strong>Device</strong></label>
      <input id="device" type="text" placeholder="e.g. NOMT10TS03B" />
      <br /><br />
      <label><strong>Rack</strong></label>
      <input id="rack" type="text" placeholder="e.g. H10" />
      <br /><br />
      <label><strong>Working With Engineer</strong></label>
      <input id="engineer" type="text" placeholder="e.g. Justin" />
      <br /><br />
    `,
    port_validation: `
      <label><strong>Device</strong></label>
      <input id="device" type="text" />
      <br /><br />
      <label><strong>Port(s)</strong></label>
      <input id="ports" type="text" placeholder="e.g. Eth1/1, Eth1/2" />
      <br /><br />
      <label><strong>Rack</strong></label>
      <input id="rack" type="text" />
      <br /><br />
      <label><strong>Expected State</strong></label>
      <input id="expectedState" type="text" placeholder="e.g. up/up" />
      <br /><br />
    `,
    redundant_connectivity: `
      <label><strong>Source Device</strong></label>
      <input id="sourceDevice" type="text" />
      <br /><br />
      <label><strong>Destination Device</strong></label>
      <input id="destinationDevice" type="text" />
      <br /><br />
      <label><strong>Source Rack</strong></label>
      <input id="sourceRack" type="text" />
      <br /><br />
      <label><strong>Destination Rack</strong></label>
      <input id="destinationRack" type="text" />
      <br /><br />
      <label><strong>Redundancy Type</strong></label>
      <input id="redundancyType" type="text" placeholder="e.g. A/B" />
      <br /><br />
    `,
    network_device_task: `
      <label><strong>Device</strong></label>
      <input id="device" type="text" />
      <br /><br />
      <label><strong>Task Details</strong></label>
      <input id="taskDetails" type="text" placeholder="e.g. verify uplink status" />
      <br /><br />
      <label><strong>Rack</strong></label>
      <input id="rack" type="text" />
      <br /><br />
    `,
    server_task: `
      <label><strong>Server Name</strong></label>
      <input id="device" type="text" />
      <br /><br />
      <label><strong>Task Details</strong></label>
      <input id="taskDetails" type="text" placeholder="e.g. check NIC connectivity" />
      <br /><br />
      <label><strong>Rack</strong></label>
      <input id="rack" type="text" />
      <br /><br />
    `
  };

  dynamicFields.innerHTML = templates[type] || "";
  generatedDescription.value = "No ticket description generated yet.";
}

function buildDescription(type) {
  switch (type) {
    case "patch_same_rack":
      return `Patch cable from ${val("sourceDevice")} port ${val("sourcePort")} to ${val("destinationDevice")} port ${val("destinationPort")} in rack ${val("rack")} from ${val("ruSource")} to ${val("ruDestination")}`;

    case "patch_cross_rack":
      return `Patch cable from ${val("sourceDevice")} port ${val("sourcePort")} in rack ${val("sourceRack")} ${val("ruSource")} to ${val("destinationDevice")} port ${val("destinationPort")} in rack ${val("destinationRack")} ${val("ruDestination")}`;

    case "patch_ohu":
      return `Patch cable from ${val("sourceDevice")} port ${val("sourcePort")} in rack ${val("rack")} ${val("ruSource")} to overhead unit ${val("ohu")} destination ${val("destinationPort")}`;

    case "power_cycle":
      return `Work with ${val("engineer")} around power cycling ${val("device")} in rack ${val("rack")}`;

    case "port_validation":
      return `Validate ports ${val("ports")} on device ${val("device")} in rack ${val("rack")} expected state ${val("expectedState")}`;

    case "redundant_connectivity":
      return `Validate redundant connectivity ${val("redundancyType")} between ${val("sourceDevice")} in rack ${val("sourceRack")} and ${val("destinationDevice")} in rack ${val("destinationRack")}`;

    case "network_device_task":
      return `Perform network device task on ${val("device")} in rack ${val("rack")}: ${val("taskDetails")}`;

    case "server_task":
      return `Perform server task on ${val("device")} in rack ${val("rack")}: ${val("taskDetails")}`;

    default:
      return "No ticket description generated yet.";
  }
}

function val(id) {
  const el = document.getElementById(id);
  return el && el.value ? el.value.trim() : "NOT_PROVIDED";
}

serviceType.addEventListener("change", () => {
  buildFields(serviceType.value);
});

dynamicFields.addEventListener("input", () => {
  generatedDescription.value = buildDescription(serviceType.value);
});

analyzeBtn.addEventListener("click", async () => {
  const description = buildDescription(serviceType.value);
  generatedDescription.value = description;

  try {
    const response = await fetch("http://127.0.0.1:5000/run-demo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ticket_number: ticketNumber.value,
        short_description: serviceType.value,
        description: description
      })
    });

    const data = await response.json();

    parsedOutput.textContent = JSON.stringify(data.parsed_ticket, null, 2);
    reportOutput.textContent = data.report;
    closureOutput.value = data.closure;

    runbookOutput.innerHTML = "";

    data.runbook.forEach((step) => {
      const li = document.createElement("li");
      li.textContent = step;
      runbookOutput.appendChild(li);
    });

  } catch (error) {
    console.error(error);
    alert("Error connecting to backend");
  }
});

document.getElementById("copyClosureBtn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(closureOutput.value);
    alert("Closure text copied.");
  } catch (error) {
    alert("Unable to copy closure text.");
    console.error(error);
  }
});