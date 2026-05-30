/* =====================================================
   RIV - MAIN WEB SCRIPT
   This file controls:
   1. Existing RIV tools:
      - Service Request Builder
      - Ticket analysis
      - Bulk Patch Assistant
   2. New RIV Operations Center:
      - Interactive topology
      - Device / port / PDU details
      - Route display
      - Label display
      - Selected object highlight
   ===================================================== */


/* =====================================================
   1. EXISTING RIV FORM REFERENCES
   These elements belong to the current Service Request
   Builder and Bulk Patch Assistant.
   ===================================================== */

const serviceType = document.getElementById("serviceType");
const ticketNumber = document.getElementById("ticketNumber");
const dynamicFields = document.getElementById("dynamicFields");
const generatedDescription = document.getElementById("generatedDescription");
const analyzeBtn = document.getElementById("analyzeBtn");

const parsedOutput = document.getElementById("parsedOutput");
const reportOutput = document.getElementById("reportOutput");
const runbookOutput = document.getElementById("runbookOutput");
const closureOutput = document.getElementById("closureOutput");


/* =====================================================
   2. SERVICE REQUEST BUILDER - DYNAMIC FIELDS
   Builds the form fields depending on the selected task.
   All examples use anonymized/demo names.
   ===================================================== */

function buildFields(type) {
  const templates = {
    patch_same_rack: `
      <label><strong>Source Device</strong></label>
      <input id="sourceDevice" type="text" placeholder="e.g. EdgeSwitch-01" />
      <br /><br />

      <label><strong>Source Port</strong></label>
      <input id="sourcePort" type="text" placeholder="e.g. Eth1/7" />
      <br /><br />

      <label><strong>Destination Device</strong></label>
      <input id="destinationDevice" type="text" placeholder="e.g. Firewall-01" />
      <br /><br />

      <label><strong>Destination Port</strong></label>
      <input id="destinationPort" type="text" placeholder="e.g. NIC1" />
      <br /><br />

      <label><strong>Rack</strong></label>
      <input id="rack" type="text" placeholder="e.g. R01" />
      <br /><br />

      <label><strong>RU Source</strong></label>
      <input id="ruSource" type="text" placeholder="e.g. RU24" />
      <br /><br />

      <label><strong>RU Destination</strong></label>
      <input id="ruDestination" type="text" placeholder="e.g. RU18" />
      <br /><br />
    `,

    patch_cross_rack: `
      <label><strong>Source Device</strong></label>
      <input id="sourceDevice" type="text" placeholder="e.g. EdgeSwitch-01" />
      <br /><br />

      <label><strong>Source Port</strong></label>
      <input id="sourcePort" type="text" placeholder="e.g. Eth1/49" />
      <br /><br />

      <label><strong>Source Rack</strong></label>
      <input id="sourceRack" type="text" placeholder="e.g. R01" />
      <br /><br />

      <label><strong>Source RU</strong></label>
      <input id="ruSource" type="text" placeholder="e.g. RU24" />
      <br /><br />

      <label><strong>Destination Device</strong></label>
      <input id="destinationDevice" type="text" placeholder="e.g. CoreSwitch-01" />
      <br /><br />

      <label><strong>Destination Port</strong></label>
      <input id="destinationPort" type="text" placeholder="e.g. Eth1/1" />
      <br /><br />

      <label><strong>Destination Rack</strong></label>
      <input id="destinationRack" type="text" placeholder="e.g. R03" />
      <br /><br />

      <label><strong>Destination RU</strong></label>
      <input id="ruDestination" type="text" placeholder="e.g. RU30" />
      <br /><br />
    `,

    patch_ohu: `
      <label><strong>Source Device</strong></label>
      <input id="sourceDevice" type="text" placeholder="e.g. EdgeSwitch-01" />
      <br /><br />

      <label><strong>Source Port</strong></label>
      <input id="sourcePort" type="text" placeholder="e.g. Eth1/7" />
      <br /><br />

      <label><strong>Rack</strong></label>
      <input id="rack" type="text" placeholder="e.g. R01" />
      <br /><br />

      <label><strong>RU Source</strong></label>
      <input id="ruSource" type="text" placeholder="e.g. RU24" />
      <br /><br />

      <label><strong>Overhead Unit</strong></label>
      <input id="ohu" type="text" placeholder="e.g. OH-Panel-A" />
      <br /><br />

      <label><strong>Destination Port / Panel Position</strong></label>
      <input id="destinationPort" type="text" placeholder="e.g. Port 12" />
      <br /><br />
    `,

    power_cycle: `
      <label><strong>Device</strong></label>
      <input id="device" type="text" placeholder="e.g. AppServer-01" />
      <br /><br />

      <label><strong>Rack</strong></label>
      <input id="rack" type="text" placeholder="e.g. R02" />
      <br /><br />

      <label><strong>Working With Engineer</strong></label>
      <input id="engineer" type="text" placeholder="e.g. Remote Engineer" />
      <br /><br />
    `,

    port_validation: `
      <label><strong>Device</strong></label>
      <input id="device" type="text" placeholder="e.g. EdgeSwitch-01" />
      <br /><br />

      <label><strong>Port(s)</strong></label>
      <input id="ports" type="text" placeholder="e.g. Eth1/7, Eth1/8" />
      <br /><br />

      <label><strong>Rack</strong></label>
      <input id="rack" type="text" placeholder="e.g. R01" />
      <br /><br />

      <label><strong>Expected State</strong></label>
      <input id="expectedState" type="text" placeholder="e.g. up/up" />
      <br /><br />
    `,

    redundant_connectivity: `
      <label><strong>Source Device</strong></label>
      <input id="sourceDevice" type="text" placeholder="e.g. EdgeSwitch-01" />
      <br /><br />

      <label><strong>Destination Device</strong></label>
      <input id="destinationDevice" type="text" placeholder="e.g. CoreSwitch-01" />
      <br /><br />

      <label><strong>Source Rack</strong></label>
      <input id="sourceRack" type="text" placeholder="e.g. R01" />
      <br /><br />

      <label><strong>Destination Rack</strong></label>
      <input id="destinationRack" type="text" placeholder="e.g. R03" />
      <br /><br />

      <label><strong>Redundancy Type</strong></label>
      <input id="redundancyType" type="text" placeholder="e.g. A/B" />
      <br /><br />
    `,

    network_device_task: `
      <label><strong>Device</strong></label>
      <input id="device" type="text" placeholder="e.g. EdgeSwitch-01" />
      <br /><br />

      <label><strong>Task Details</strong></label>
      <input id="taskDetails" type="text" placeholder="e.g. verify uplink status" />
      <br /><br />

      <label><strong>Rack</strong></label>
      <input id="rack" type="text" placeholder="e.g. R01" />
      <br /><br />
    `,

    server_task: `
      <label><strong>Server Name</strong></label>
      <input id="device" type="text" placeholder="e.g. AppServer-01" />
      <br /><br />

      <label><strong>Task Details</strong></label>
      <input id="taskDetails" type="text" placeholder="e.g. check NIC connectivity" />
      <br /><br />

      <label><strong>Rack</strong></label>
      <input id="rack" type="text" placeholder="e.g. R02" />
      <br /><br />
    `
  };

  dynamicFields.innerHTML = templates[type] || "";
  generatedDescription.value = "No ticket description generated yet.";
}


/* =====================================================
   3. SERVICE REQUEST DESCRIPTION BUILDER
   Converts form values into a structured ticket description.
   ===================================================== */

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


/* =====================================================
   4. FORM VALUE HELPER
   Safely reads form field values.
   ===================================================== */

function val(id) {
  const el = document.getElementById(id);
  return el && el.value ? el.value.trim() : "NOT_PROVIDED";
}


/* =====================================================
   5. BULK PATCH ASSISTANT RENDERER
   Renders the parsed bulk patch output returned by backend.
   ===================================================== */

function renderBulkTasks(data) {
  const bulkOutput = document.getElementById("bulkOutput");

  if (!data || data.status !== "success") {
    bulkOutput.textContent = JSON.stringify(data, null, 2);
    return;
  }

  const result = data.result || {};
  const tasks = result.tasks || [];

  if (!tasks.length) {
    bulkOutput.innerHTML = "<p>No patch tasks were found in the Excel file.</p>";
    return;
  }

  let html = `<h3>Total Tasks: ${result.total_tasks}</h3>`;

  tasks.forEach((task, index) => {
    const errors = task.validation_errors || [];
    const warnings = task.warnings || [];
    const runbook = task.runbook || [];
    const hardware = task.hardware_profile || {};

    html += `
      <div class="task-card">
        <h4>Task ${index + 1} — Excel Row ${task.row_number}</h4>

        <p><strong>Source:</strong> ${task.source_device} (${task.source_rack} / ${task.source_ru})</p>
        <p><strong>Source Port:</strong> ${task.source_port}</p>

        <p><strong>Destination:</strong> ${task.target_device} (${task.target_rack} / ${task.target_ru})</p>
        <p><strong>Destination Port:</strong> ${task.target_port}</p>

        <p><strong>SFP / Transceiver:</strong> ${task.sfp_model}</p>
        <p><strong>Cable:</strong> ${task.cable_media} / ${task.connection_type}</p>
        <p><strong>Speed:</strong> ${task.speed}</p>

        <p><strong>Detected Hardware:</strong> ${hardware.detected_model || "UNKNOWN"} |
        ${hardware.media || "UNKNOWN"} | ${hardware.connection || "UNKNOWN"} | ${hardware.speed || "UNKNOWN"}</p>

        ${
          errors.length
            ? `<p class="error">❌ Errors: ${errors.join(", ")}</p>`
            : `<p class="ok">✅ No validation errors</p>`
        }

        ${
          warnings.length
            ? `<p class="warning">⚠️ Warnings: ${warnings.join(", ")}</p>`
            : ""
        }

        <details>
          <summary>📘 Runbook</summary>
          <ol>
            ${runbook.map(step => `<li>${step}</li>`).join("")}
          </ol>
        </details>
      </div>
    `;
  });

  bulkOutput.innerHTML = html;
}


/* =====================================================
   6. EXISTING RIV FORM EVENT LISTENERS
   Keeps the original Service Request Builder working.
   ===================================================== */

serviceType.addEventListener("change", () => {
  buildFields(serviceType.value);
});

dynamicFields.addEventListener("input", () => {
  generatedDescription.value = buildDescription(serviceType.value);
});

analyzeBtn.addEventListener("click", async (event) => {
  event.preventDefault();

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

document.getElementById("copyClosureBtn").addEventListener("click", async (event) => {
  event.preventDefault();

  try {
    await navigator.clipboard.writeText(closureOutput.value);
    alert("Closure text copied.");
  } catch (error) {
    alert("Unable to copy closure text.");
    console.error(error);
  }
});

document.getElementById("uploadExcelBtn").addEventListener("click", async (event) => {
  event.preventDefault();

  const fileInput = document.getElementById("excelFile");
  const bulkOutput = document.getElementById("bulkOutput");

  if (!fileInput.files.length) {
    alert("Please select an Excel file.");
    return;
  }

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  bulkOutput.textContent = "Uploading and processing Excel...";

  try {
    const response = await fetch("http://127.0.0.1:5000/upload-patch-plan", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!response.ok || data.status === "error") {
      bulkOutput.textContent = JSON.stringify(data, null, 2);
      alert(data.error || "Backend returned an upload error.");
      return;
    }

    renderBulkTasks(data);

  } catch (error) {
    console.error("Upload failed:", error);
    bulkOutput.textContent = `Upload failed: ${error.message}`;
    alert(`Error uploading Excel: ${error.message}`);
  }
});


/* =====================================================
   7. RIV OPERATIONS CENTER - INTERACTIVE DEMO MODEL
   This is the first visual DCIM/topology model.
   Data is fictitious and anonymized.
   Later this should come from RIV database/API.
   ===================================================== */

const rivOperationsData = {
  "EdgeSwitch-01": {
    title: "EdgeSwitch-01",
    status: "Online",

    details: [
      ["Location", "DemoDC-01 · Rack R01 · RU24"],
      ["Device Type", "Network Switch · 48x25G + 6x100G"],
      ["Ports", "48 total · 12 used · 36 available"],
      ["Installed Optics", "8 SFP28-SR · 2 QSFP28-SR4"],
      ["Power", "PSU-A → PDU-A / PSU-B → PDU-B"]
    ],

    route: [
      "EdgeSwitch-01 · Rack R01 · RU24",
      "Eth1/7 · 25G SFP28-SR",
      "OH-Panel-A · Port 12",
      "MDF-Core-A · Port 21",
      "Backbone-01",
      "MDF-Core-B · Port 21",
      "OH-Panel-B · Port 07",
      "AppServer-01 · Rack R02 · RU18 · NIC1"
    ],

    label:
      "EdgeSwitch-01-R01-RU24-Eth1/7 → AppServer-01-R02-RU18-NIC1"
  },

  "AppServer-01": {
    title: "AppServer-01",
    status: "Online",

    details: [
      ["Location", "DemoDC-01 · Rack R02 · RU18"],
      ["Device Type", "Application Server"],
      ["Ports", "4 total · 2 used · 2 available"],
      ["Installed Optics", "2 SFP28-SR"],
      ["Power", "PSU-A → PDU-A / PSU-B → PDU-B"]
    ],

    route: [
      "AppServer-01 · Rack R02 · RU18 · NIC1",
      "OH-Panel-B · Port 07",
      "MDF-Core-B · Port 21",
      "Backbone-01",
      "MDF-Core-A · Port 21",
      "OH-Panel-A · Port 12",
      "EdgeSwitch-01 · Rack R01 · RU24 · Eth1/7"
    ],

    label:
      "AppServer-01-R02-RU18-NIC1 → EdgeSwitch-01-R01-RU24-Eth1/7"
  },

  "OH-Panel-A": {
    title: "OH-Panel-A",
    status: "Path Node",

    details: [
      ["Component", "Overhead Panel"],
      ["Port", "Port 12"],
      ["Source", "EdgeSwitch-01 · Eth1/7"],
      ["Destination", "MDF-Core-A · Port 21"],
      ["Cable", "LC-LC MM Fiber · 3m"]
    ],

    route: [
      "EdgeSwitch-01 · Rack R01 · RU24 · Eth1/7",
      "OH-Panel-A · Port 12",
      "MDF-Core-A · Port 21",
      "Backbone-01",
      "MDF-Core-B · Port 21",
      "OH-Panel-B · Port 07",
      "AppServer-01 · Rack R02 · RU18 · NIC1"
    ],

    label:
      "OH-Panel-A-P12 → MDF-Core-A-P21"
  },

  "MDF-Core-A": {
    title: "MDF-Core-A",
    status: "Backbone A",

    details: [
      ["Component", "MDF Panel"],
      ["Backbone", "Backbone-01 side A"],
      ["Input", "OH-Panel-A · Port 12"],
      ["Output", "MDF-Core-B · Port 21"],
      ["Validation", "Path segment complete"]
    ],

    route: [
      "OH-Panel-A · Port 12",
      "MDF-Core-A · Port 21",
      "Backbone-01",
      "MDF-Core-B · Port 21",
      "OH-Panel-B · Port 07"
    ],

    label:
      "MDF-Core-A-P21 → MDF-Core-B-P21"
  },

  "MDF-Core-B": {
    title: "MDF-Core-B",
    status: "Backbone B",

    details: [
      ["Component", "MDF Panel"],
      ["Backbone", "Backbone-01 side B"],
      ["Input", "MDF-Core-A · Port 21"],
      ["Output", "OH-Panel-B · Port 07"],
      ["Validation", "Path segment complete"]
    ],

    route: [
      "MDF-Core-A · Port 21",
      "Backbone-01",
      "MDF-Core-B · Port 21",
      "OH-Panel-B · Port 07",
      "AppServer-01 · NIC1"
    ],

    label:
      "MDF-Core-B-P21 → OH-Panel-B-P07"
  },

  "OH-Panel-B": {
    title: "OH-Panel-B",
    status: "Path Node",

    details: [
      ["Component", "Overhead Panel"],
      ["Port", "Port 07"],
      ["Source", "MDF-Core-B · Port 21"],
      ["Destination", "AppServer-01 · NIC1"],
      ["Cable", "LC-LC MM Fiber · 5m"]
    ],

    route: [
      "MDF-Core-B · Port 21",
      "OH-Panel-B · Port 07",
      "AppServer-01 · Rack R02 · RU18 · NIC1"
    ],

    label:
      "OH-Panel-B-P07 → AppServer-01-R02-RU18-NIC1"
  },

  "Backbone-01": {
    title: "Backbone-01",
    status: "Redundant",

    details: [
      ["Type", "Fiber Backbone"],
      ["Media", "MM Fiber"],
      ["Connector", "LC-LC"],
      ["Length", "15m"],
      ["Path", "MDF-Core-A → MDF-Core-B"]
    ],

    route: [
      "MDF-Core-A · Port 21",
      "Backbone-01 · LC-LC MM · 15m",
      "MDF-Core-B · Port 21"
    ],

    label:
      "MDF-Core-A-P21 → Backbone-01 → MDF-Core-B-P21"
  },

  "Eth1/7": {
    title: "Eth1/7",
    status: "Available",

    details: [
      ["Parent Device", "EdgeSwitch-01"],
      ["Port Type", "25G SFP28"],
      ["Installed Optic", "SFP28-SR"],
      ["Media", "MM Fiber · LC connector"],
      ["Recommended Use", "25G short-range server connection"]
    ],

    route: [
      "EdgeSwitch-01 · Rack R01 · RU24 · Eth1/7",
      "Available for new connection",
      "Recommended path: OH-Panel-A → MDF-Core-A"
    ],

    label:
      "EdgeSwitch-01-R01-RU24-Eth1/7 → AVAILABLE"
  },

  "Eth1/8": {
    title: "Eth1/8",
    status: "Available",

    details: [
      ["Parent Device", "EdgeSwitch-01"],
      ["Port Type", "25G SFP28"],
      ["Installed Optic", "SFP28-SR"],
      ["Media", "MM Fiber · LC connector"],
      ["Recommended Use", "Secondary or redundant 25G server link"]
    ],

    route: [
      "EdgeSwitch-01 · Rack R01 · RU24 · Eth1/8",
      "Available for new connection",
      "Recommended path: OH-Panel-A → MDF-Core-A"
    ],

    label:
      "EdgeSwitch-01-R01-RU24-Eth1/8 → AVAILABLE"
  },

  "Eth1/49": {
    title: "Eth1/49",
    status: "Connected",

    details: [
      ["Origin", "EdgeSwitch-01 · Eth1/49"],
      ["Destination", "CoreSwitch-01 · Eth1/1"],
      ["Optic", "QSFP28-SR4"],
      ["Speed", "100G"],
      ["Media", "MM Fiber"]
    ],

    route: [
      "EdgeSwitch-01 · Rack R01 · RU24 · Eth1/49",
      "OH-Panel-A · Port 14",
      "MDF-Core-A · Port 23",
      "CoreSwitch-01 · Rack R03 · RU30 · Eth1/1"
    ],

    label:
      "EdgeSwitch-01-R01-RU24-Eth1/49 → CoreSwitch-01-R03-RU30-Eth1/1"
  },

  "PDU-A": {
    title: "PDU-A",
    status: "Feed A",

    details: [
      ["Location", "Rack R01 · Left side"],
      ["Power Feed", "A Feed"],
      ["Outlets", "12 used · 12 available"],
      ["Load", "42%"],
      ["Connected Devices", "EdgeSwitch-01 PSU-A, CoreSwitch-01 PSU-A"]
    ],

    route: [
      "Power Feed A",
      "PDU-A · Rack R01",
      "Outlet A-08",
      "EdgeSwitch-01 · PSU-A"
    ],

    label:
      "PDU-A-Outlet-A08 → EdgeSwitch-01-PSU-A"
  },

  "PDU-B": {
    title: "PDU-B",
    status: "Feed B",

    details: [
      ["Location", "Rack R01 · Right side"],
      ["Power Feed", "B Feed"],
      ["Outlets", "11 used · 13 available"],
      ["Load", "39%"],
      ["Connected Devices", "EdgeSwitch-01 PSU-B, CoreSwitch-01 PSU-B"]
    ],

    route: [
      "Power Feed B",
      "PDU-B · Rack R01",
      "Outlet B-08",
      "EdgeSwitch-01 · PSU-B"
    ],

    label:
      "PDU-B-Outlet-B08 → EdgeSwitch-01-PSU-B"
  }
};


/* =====================================================
   8. RIGHT-SIDE DETAIL PANEL RENDERER
   Shows:
   - object technical details
   - operational route
   - generated cable/power label
   ===================================================== */

function updateRivDetails(itemName) {
  const item = rivOperationsData[itemName];

  if (!item) {
    return;
  }

  const title = document.querySelector(".details-panel .panel-title h3");
  const status = document.querySelector(".details-panel .badge");
  const detailList = document.querySelector(".details-panel .detail-list");

  if (!title || !status || !detailList) {
    return;
  }

  title.textContent = item.title;
  status.textContent = item.status;

  const detailsHtml = item.details
    .map(([label, value]) => `
      <div>
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `)
    .join("");

  const routeHtml = item.route
    ? `
      <div class="route-card">
        <span>Route</span>
        <ol>
          ${item.route.map(step => `<li>${step}</li>`).join("")}
        </ol>
      </div>
    `
    : "";

  const labelHtml = item.label
    ? `
      <div class="label-card">
        <span>Label</span>
        <strong>${item.label}</strong>
      </div>
    `
    : "";

  detailList.innerHTML = `
    ${detailsHtml}
    ${routeHtml}
    ${labelHtml}
  `;
}


/* =====================================================
   9. SELECTED OBJECT HIGHLIGHT HELPERS
   Keeps only one visual object highlighted at a time.
   ===================================================== */

function clearRivSelection() {
  document
    .querySelectorAll(".riv-selected")
    .forEach((element) => element.classList.remove("riv-selected"));
}

function selectRivElement(element) {
  clearRivSelection();
  element.classList.add("riv-selected");
}


/* =====================================================
   10. OPERATIONS CENTER CLICK EVENTS
   Makes topology, ports and PDUs interactive.
   ===================================================== */

document.querySelectorAll(".topology-node").forEach((node) => {
  node.addEventListener("click", () => {
    const nodeName = node.querySelector("strong")?.textContent?.trim();

    updateRivDetails(nodeName);
    selectRivElement(node);
  });
});

document.querySelectorAll(".backbone-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    updateRivDetails("Backbone-01");
    selectRivElement(pill);
  });
});

document.querySelectorAll(".port-list button").forEach((portButton) => {
  portButton.addEventListener("click", () => {
    const portName = portButton.querySelector("span")?.textContent?.trim();

    updateRivDetails(portName);
    selectRivElement(portButton);
  });
});

document.querySelectorAll(".power-cards div").forEach((pduCard) => {
  pduCard.addEventListener("click", () => {
    const pduName = pduCard.querySelector("span")?.textContent?.trim();

    updateRivDetails(pduName);
    selectRivElement(pduCard);
  });
});


/* =====================================================
   11. DEFAULT OBJECT ON PAGE LOAD
   Shows a useful object in the detail panel immediately.
   ===================================================== */

updateRivDetails("EdgeSwitch-01");