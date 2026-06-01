/* ==========================================================
   Romanoti RIV - Operations Center Logic
   File: src/web/app.js

   Purpose:
   - Company / Data Center / Rack selection
   - Realistic rack rendering
   - RU numbers inside rack
   - Device selection
   - Port click, highlight and details
   - Preserve existing ticket builder workflow
   ========================================================== */


/* ==========================================================
   SECTION 1 - Demo infrastructure data model

   NOTE:
   This is local demo data for the pilot.
   Later it should come from RIV backend/database.
   ========================================================== */

const rivModel = {
  companies: [
    {
      id: "romanoti",
      name: "RomanoTI-Solutions Inc.",
      datacenters: [
        {
          id: "demodc01",
          name: "DemoDC-01",
          location: "Romanoti Pilot Environment",
          racks: [
            {
              id: "R42",
              name: "Rack R42",
              type: "Network / Compute Rack",
              height: 42,
              devices: [
                {
                  id: "core-sw-01",
                  name: "CORE-SW-01",
                  label: "Core Switch",
                  model: "Cisco Catalyst 9300-24T",
                  type: "switch",
                  ruTop: 39,
                  ruHeight: 2,
                  ip: "10.10.10.1",
                  mac: "00:1A:2B:3C:4D:5E",
                  status: "operational",
                  power: "PSU-A → PDU-A / PSU-B → PDU-B",
                  ports: buildPorts("Eth", 26, {
                    5: {
                      status: "up",
                      speed: "1 Gbps",
                      vlan: "10",
                      connectedDevice: "DIST-SW-01",
                      connectedPort: "Gi1/0/5",
                      description: "Uplink to Distribution Switch",
                      cable: "Cat6A Copper",
                      length: "3m",
                      transceiver: "RJ45"
                    },
                    14: {
                      status: "warning",
                      speed: "1 Gbps",
                      vlan: "20",
                      connectedDevice: "FW-01",
                      connectedPort: "Port 3",
                      description: "Firewall handoff, recent flap detected",
                      cable: "Cat6A Copper",
                      length: "2m",
                      transceiver: "RJ45"
                    }
                  })
                },
                {
                  id: "dist-sw-01",
                  name: "DIST-SW-01",
                  label: "Distribution Switch",
                  model: "Cisco Catalyst 9200-24P",
                  type: "switch",
                  ruTop: 32,
                  ruHeight: 2,
                  ip: "10.10.20.1",
                  mac: "00:1A:2B:3C:4D:61",
                  status: "operational",
                  power: "PSU-A → PDU-A",
                  ports: buildPorts("Gi1/0", 24, {
                    5: {
                      status: "up",
                      speed: "1 Gbps",
                      vlan: "10",
                      connectedDevice: "CORE-SW-01",
                      connectedPort: "Eth5",
                      description: "Uplink to Core Switch",
                      cable: "Cat6A Copper",
                      length: "3m",
                      transceiver: "RJ45"
                    }
                  })
                },
                {
                  id: "fw-01",
                  name: "FW-01",
                  label: "Firewall",
                  model: "FortiGate 100F",
                  type: "switch",
                  ruTop: 27,
                  ruHeight: 2,
                  ip: "10.10.30.1",
                  mac: "00:1A:2B:3C:4D:80",
                  status: "operational",
                  power: "PSU-A → PDU-A",
                  ports: buildPorts("Port", 12, {
                    3: {
                      status: "warning",
                      speed: "1 Gbps",
                      vlan: "WAN",
                      connectedDevice: "CORE-SW-01",
                      connectedPort: "Eth14",
                      description: "Firewall handoff from core",
                      cable: "Cat6A Copper",
                      length: "2m",
                      transceiver: "RJ45"
                    }
                  })
                },
                {
                  id: "srv-app-01",
                  name: "SRV-APP-01",
                  label: "Application Server",
                  model: "Dell PowerEdge R650",
                  type: "server",
                  ruTop: 19,
                  ruHeight: 2,
                  ip: "10.10.40.21",
                  mac: "00:1A:2B:3C:4D:A1",
                  status: "operational",
                  power: "PSU-A → PDU-A / PSU-B → PDU-B",
                  ports: buildPorts("NIC", 4, {
                    1: {
                      status: "up",
                      speed: "10 Gbps",
                      vlan: "120",
                      connectedDevice: "DIST-SW-01",
                      connectedPort: "Gi1/0/12",
                      description: "Primary server uplink",
                      cable: "LC-LC MM Fiber",
                      length: "15m",
                      transceiver: "SFP+ SR"
                    },
                    2: {
                      status: "up",
                      speed: "10 Gbps",
                      vlan: "120",
                      connectedDevice: "DIST-SW-01",
                      connectedPort: "Gi1/0/13",
                      description: "Secondary server uplink",
                      cable: "LC-LC MM Fiber",
                      length: "15m",
                      transceiver: "SFP+ SR"
                    }
                  })
                },
                {
                  id: "storage-01",
                  name: "STORAGE-01",
                  label: "Storage Array",
                  model: "Dell PowerVault ME4024",
                  type: "storage",
                  ruTop: 15,
                  ruHeight: 2,
                  ip: "10.10.50.10",
                  mac: "00:1A:2B:3C:4D:C1",
                  status: "operational",
                  power: "PSU-A → PDU-A / PSU-B → PDU-B",
                  ports: buildPorts("iSCSI", 8, {
                    1: {
                      status: "up",
                      speed: "10 Gbps",
                      vlan: "150",
                      connectedDevice: "DIST-SW-01",
                      connectedPort: "Gi1/0/20",
                      description: "Storage path A",
                      cable: "LC-LC MM Fiber",
                      length: "10m",
                      transceiver: "SFP+ SR"
                    }
                  })
                },
                {
                  id: "ups-01",
                  name: "UPS-01",
                  label: "Rack UPS",
                  model: "APC Smart-UPS 3000",
                  type: "power",
                  ruTop: 9,
                  ruHeight: 3,
                  ip: "10.10.60.5",
                  mac: "00:1A:2B:3C:4D:E1",
                  status: "operational",
                  power: "Input A/B monitored",
                  ports: buildPorts("Outlet", 8, {})
                }
              ]
            }
          ]
        },
        {
          id: "northhub",
          name: "NorthHub-01",
          location: "Future demo site",
          racks: [
            {
              id: "R01",
              name: "Rack R01",
              type: "Demo Rack",
              height: 42,
              devices: []
            }
          ]
        }
      ]
    },
    {
      id: "client-alpha",
      name: "Client Alpha Demo",
      datacenters: [
        {
          id: "alpha-dc",
          name: "AlphaDC-01",
          location: "Client demo environment",
          racks: [
            {
              id: "A01",
              name: "Rack A01",
              type: "Client Demo Rack",
              height: 42,
              devices: []
            }
          ]
        }
      ]
    }
  ]
};


/* ==========================================================
   SECTION 2 - DOM references for new RIV UI
   ========================================================== */

const companySelect = document.getElementById("companySelect");
const datacenterSelect = document.getElementById("datacenterSelect");
const rackSelect = document.getElementById("rackSelect");
const loadRackBtn = document.getElementById("loadRackBtn");

const rackCanvas = document.getElementById("rackCanvas");
const rackViewTitle = document.getElementById("rackViewTitle");
const rackTitle = document.getElementById("rackTitle");

const companyMetric = document.getElementById("companyMetric");
const datacenterMetric = document.getElementById("datacenterMetric");
const heightMetric = document.getElementById("heightMetric");
const utilizationMetric = document.getElementById("utilizationMetric");
const sidebarSiteName = document.getElementById("sidebarSiteName");

const detailType = document.getElementById("detailType");
const detailTitle = document.getElementById("detailTitle");
const detailState = document.getElementById("detailState");
const detailBody = document.getElementById("detailBody");

const selectedPortSummary = document.getElementById("selectedPortSummary");
const connectionSummary = document.getElementById("connectionSummary");
const smartHandsSummary = document.getElementById("smartHandsSummary");

const zoomOutBtn = document.getElementById("zoomOutBtn");
const zoomInBtn = document.getElementById("zoomInBtn");
const fitRackBtn = document.getElementById("fitRackBtn");
const zoomLabel = document.getElementById("zoomLabel");

let activeCompany = null;
let activeDatacenter = null;
let activeRack = null;
let selectedDeviceId = null;
let selectedPortKey = null;
let rackZoom = 1;


/* ==========================================================
   SECTION 3 - Initialization
   ========================================================== */

initCompanySelector();
attachRackEvents();


function initCompanySelector() {
  rivModel.companies.forEach((company) => {
    const option = document.createElement("option");
    option.value = company.id;
    option.textContent = company.name;
    companySelect.appendChild(option);
  });
}


function attachRackEvents() {
  companySelect.addEventListener("change", handleCompanyChange);
  datacenterSelect.addEventListener("change", handleDatacenterChange);
  rackSelect.addEventListener("change", handleRackChange);
  loadRackBtn.addEventListener("click", loadSelectedRack);

  zoomInBtn.addEventListener("click", () => setRackZoom(rackZoom + 0.15));
  zoomOutBtn.addEventListener("click", () => setRackZoom(rackZoom - 0.15));
  fitRackBtn.addEventListener("click", () => setRackZoom(1));
}


/* ==========================================================
   SECTION 4 - Company / Data Center / Rack selection
   ========================================================== */

function handleCompanyChange() {
  activeCompany = rivModel.companies.find((company) => company.id === companySelect.value) || null;
  activeDatacenter = null;
  activeRack = null;

  resetSelect(datacenterSelect, "Select data center");
  resetSelect(rackSelect, "Select rack");
  rackSelect.disabled = true;

  if (!activeCompany) {
    datacenterSelect.disabled = true;
    return;
  }

  activeCompany.datacenters.forEach((dc) => {
    const option = document.createElement("option");
    option.value = dc.id;
    option.textContent = dc.name;
    datacenterSelect.appendChild(option);
  });

  datacenterSelect.disabled = false;
}


function handleDatacenterChange() {
  if (!activeCompany) return;

  activeDatacenter = activeCompany.datacenters.find((dc) => dc.id === datacenterSelect.value) || null;
  activeRack = null;

  resetSelect(rackSelect, "Select rack");

  if (!activeDatacenter) {
    rackSelect.disabled = true;
    return;
  }

  activeDatacenter.racks.forEach((rack) => {
    const option = document.createElement("option");
    option.value = rack.id;
    option.textContent = `${rack.name} - ${rack.type}`;
    rackSelect.appendChild(option);
  });

  rackSelect.disabled = false;
}


function handleRackChange() {
  if (!activeDatacenter) return;

  activeRack = activeDatacenter.racks.find((rack) => rack.id === rackSelect.value) || null;
}


function loadSelectedRack() {
  if (!activeCompany || !activeDatacenter || !activeRack) {
    alert("Please select company, data center and rack.");
    return;
  }

  selectedDeviceId = activeRack.devices[0]?.id || null;
  selectedPortKey = null;

  renderRack(activeRack);
  updateRackMetrics();
  updateDeviceDetail(getSelectedDevice());

  document.getElementById("infrastructure").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


function resetSelect(select, placeholder) {
  select.innerHTML = "";
  const option = document.createElement("option");
  option.value = "";
  option.textContent = placeholder;
  select.appendChild(option);
}


/* ==========================================================
   SECTION 5 - Rack renderer
   ========================================================== */

function renderRack(rack) {
  rackCanvas.innerHTML = "";

  const rackFrame = document.createElement("div");
  rackFrame.className = "rack-frame";
  rackFrame.style.transform = `scale(${rackZoom})`;

  rackFrame.innerHTML = `
    <div class="rack-top-label">${rack.id}</div>
    <div class="rack-inner" id="rackInner"></div>
  `;

  rackCanvas.appendChild(rackFrame);

  const rackInner = rackFrame.querySelector("#rackInner");

  renderRuNumbers(rackInner, rack.height);
  renderBlankSpaces(rackInner, rack);
  renderDevices(rackInner, rack);

  rackViewTitle.textContent = `${activeDatacenter.name} / ${rack.name}`;
}


function renderRuNumbers(rackInner, height) {
  for (let ru = height; ru >= 1; ru--) {
    const top = ((height - ru) / height) * 100;

    const left = document.createElement("div");
    left.className = "ru-number";
    left.style.top = `${top}%`;
    left.textContent = String(ru).padStart(2, "0");
    rackInner.appendChild(left);

    const right = document.createElement("div");
    right.className = "ru-number right";
    right.style.top = `${top}%`;
    right.textContent = String(ru).padStart(2, "0");
    rackInner.appendChild(right);
  }
}


function renderBlankSpaces(rackInner, rack) {
  const used = new Set();

  rack.devices.forEach((device) => {
    for (let ru = device.ruTop; ru > device.ruTop - device.ruHeight; ru--) {
      used.add(ru);
    }
  });

  let start = null;
  let count = 0;

  for (let ru = rack.height; ru >= 1; ru--) {
    if (!used.has(ru)) {
      if (start === null) start = ru;
      count++;
    } else {
      if (count >= 3) createBlankPanel(rackInner, rack.height, start, count);
      start = null;
      count = 0;
    }
  }

  if (count >= 3) createBlankPanel(rackInner, rack.height, start, count);
}


function createBlankPanel(rackInner, height, startRu, ruCount) {
  const panel = document.createElement("div");
  panel.className = "blank-panel";

  const top = ((height - startRu) / height) * 100;
  const h = (ruCount / height) * 100;

  panel.style.top = `${top}%`;
  panel.style.height = `${h}%`;

  rackInner.appendChild(panel);
}


function renderDevices(rackInner, rack) {
  rack.devices.forEach((device) => {
    const top = ((rack.height - device.ruTop) / rack.height) * 100;
    const height = (device.ruHeight / rack.height) * 100;

    const deviceEl = document.createElement("div");
    deviceEl.className = `device-block device-${device.type}`;
    deviceEl.dataset.deviceId = device.id;
    deviceEl.style.top = `${top}%`;
    deviceEl.style.height = `${height}%`;

    if (device.id === selectedDeviceId && !selectedPortKey) {
      deviceEl.classList.add("selected");
    }

    deviceEl.innerHTML = `
      <div class="device-label">
        <strong>${device.name}</strong>
        <span>RU${device.ruTop} • ${device.label}</span>
      </div>
      <div class="device-face"></div>
    `;

    const face = deviceEl.querySelector(".device-face");

    device.ports.slice(0, getVisiblePorts(device)).forEach((port) => {
      const portEl = document.createElement("button");
      portEl.type = "button";
      portEl.className = `port ${port.status}`;
      portEl.dataset.deviceId = device.id;
      portEl.dataset.portKey = port.key;
      portEl.title = `${device.name} ${port.name} - ${port.status}`;

      if (device.id === selectedDeviceId && selectedPortKey === port.key) {
        portEl.classList.add("selected");
      }

      face.appendChild(portEl);
    });

    rackInner.appendChild(deviceEl);
  });

  rackInner.querySelectorAll(".device-block").forEach((el) => {
    el.addEventListener("click", (event) => {
      const portButton = event.target.closest(".port");
      if (portButton) return;

      selectedDeviceId = el.dataset.deviceId;
      selectedPortKey = null;
      refreshRackAndDetails();
    });
  });

  rackInner.querySelectorAll(".port").forEach((portEl) => {
    portEl.addEventListener("click", (event) => {
      event.stopPropagation();
      selectedDeviceId = portEl.dataset.deviceId;
      selectedPortKey = portEl.dataset.portKey;
      refreshRackAndDetails();
    });
  });
}


function getVisiblePorts(device) {
  if (device.type === "server") return 4;
  if (device.type === "storage") return 8;
  if (device.type === "power") return 8;
  return Math.min(device.ports.length, 26);
}


function refreshRackAndDetails() {
  renderRack(activeRack);

  const device = getSelectedDevice();
  const port = getSelectedPort();

  if (port) {
    updatePortDetail(device, port);
  } else {
    updateDeviceDetail(device);
  }
}


/* ==========================================================
   SECTION 6 - Detail panel
   ========================================================== */

function updateRackMetrics() {
  const usedRu = activeRack.devices.reduce((total, device) => total + device.ruHeight, 0);

  rackTitle.textContent = activeRack.name;
  companyMetric.textContent = activeCompany.name;
  datacenterMetric.textContent = activeDatacenter.name;
  heightMetric.textContent = `${activeRack.height}U`;
  utilizationMetric.textContent = `${usedRu}U / ${activeRack.height}U (${Math.round((usedRu / activeRack.height) * 100)}%)`;
  sidebarSiteName.textContent = activeDatacenter.name;
}


function updateDeviceDetail(device) {
  if (!device) return;

  detailType.textContent = "Selected Device";
  detailTitle.textContent = device.name;
  detailState.textContent = device.status;
  detailState.className = `state-pill ${device.status}`;

  detailBody.innerHTML = `
    <div class="detail-row">
      <span>Device Label</span>
      <strong>${device.label}</strong>
    </div>
    <div class="detail-row">
      <span>Model</span>
      <strong>${device.model}</strong>
    </div>
    <div class="detail-row">
      <span>Rack Position</span>
      <strong>${activeRack.name} • RU${device.ruTop}</strong>
    </div>
    <div class="detail-row">
      <span>IP / MAC</span>
      <strong>${device.ip} / ${device.mac}</strong>
    </div>
    <div class="detail-row">
      <span>Power</span>
      <strong>${device.power}</strong>
    </div>
    <div class="detail-row">
      <span>Ports</span>
      <div class="port-map">
        ${device.ports.slice(0, 26).map((port) => `
          <button
            type="button"
            class="port ${port.status} ${selectedPortKey === port.key ? "selected" : ""}"
            data-detail-device="${device.id}"
            data-detail-port="${port.key}"
            title="${port.name} - ${port.status}">
          </button>
        `).join("")}
      </div>
    </div>
  `;

  detailBody.querySelectorAll("[data-detail-port]").forEach((portEl) => {
    portEl.addEventListener("click", () => {
      selectedDeviceId = portEl.dataset.detailDevice;
      selectedPortKey = portEl.dataset.detailPort;
      refreshRackAndDetails();
    });
  });

  selectedPortSummary.textContent = "No individual port selected.";
  connectionSummary.innerHTML = `
    <strong>${device.name}</strong><br>
    Label: ${device.label}<br>
    Rack: ${activeRack.name} / RU${device.ruTop}
  `;
  smartHandsSummary.innerHTML = `
    Locate <strong>${device.name}</strong> in <strong>${activeRack.name}</strong> at <strong>RU${device.ruTop}</strong>.
    Confirm device label, power status and operational LEDs before starting work.
  `;
}


function updatePortDetail(device, port) {
  detailType.textContent = "Selected Port";
  detailTitle.textContent = `${device.name} / ${port.name}`;
  detailState.textContent = port.status;
  detailState.className = `state-pill ${port.status === "up" ? "up" : port.status}`;

  detailBody.innerHTML = `
    <div class="detail-row">
      <span>Status</span>
      <strong>${port.status}</strong>
    </div>
    <div class="detail-row">
      <span>Speed</span>
      <strong>${port.speed}</strong>
    </div>
    <div class="detail-row">
      <span>VLAN</span>
      <strong>${port.vlan}</strong>
    </div>
    <div class="detail-row">
      <span>Connected Device</span>
      <strong>${port.connectedDevice || "Not connected"}</strong>
    </div>
    <div class="detail-row">
      <span>Connected Port</span>
      <strong>${port.connectedPort || "N/A"}</strong>
    </div>
    <div class="detail-row">
      <span>Cable / Length</span>
      <strong>${port.cable} • ${port.length}</strong>
    </div>
    <div class="detail-row">
      <span>Transceiver</span>
      <strong>${port.transceiver}</strong>
    </div>
    <div class="detail-row">
      <span>Description</span>
      <strong>${port.description}</strong>
    </div>
  `;

  selectedPortSummary.innerHTML = `
    <strong>${device.name} ${port.name}</strong><br>
    Status: ${port.status}<br>
    Speed: ${port.speed}<br>
    VLAN: ${port.vlan}
  `;

  connectionSummary.innerHTML = `
    <strong>Route</strong><br>
    ${device.name} ${port.name}
    ${port.connectedDevice ? `→ ${port.connectedDevice} ${port.connectedPort}` : "→ No endpoint recorded"}<br>
    Label: ${device.name}-${port.name}-${port.connectedDevice || "OPEN"}
  `;

  smartHandsSummary.innerHTML = `
    Prepare <strong>${port.cable}</strong> (${port.length}) and <strong>${port.transceiver}</strong>.
    Validate link status on <strong>${device.name} ${port.name}</strong>
    ${port.connectedDevice ? `and destination <strong>${port.connectedDevice} ${port.connectedPort}</strong>.` : "."}
  `;
}


function getSelectedDevice() {
  if (!activeRack) return null;
  return activeRack.devices.find((device) => device.id === selectedDeviceId) || null;
}


function getSelectedPort() {
  const device = getSelectedDevice();
  if (!device || !selectedPortKey) return null;
  return device.ports.find((port) => port.key === selectedPortKey) || null;
}


function setRackZoom(value) {
  rackZoom = Math.min(1.6, Math.max(0.75, value));
  zoomLabel.textContent = `${Math.round(rackZoom * 100)}%`;

  if (activeRack) {
    renderRack(activeRack);
  }
}


/* ==========================================================
   SECTION 7 - Helpers
   ========================================================== */

function buildPorts(prefix, count, overrides) {
  const ports = [];

  for (let index = 1; index <= count; index++) {
    const override = overrides[index] || {};

    ports.push({
      key: String(index),
      name: `${prefix}${index}`,
      status: override.status || (index % 9 === 0 ? "offline" : "up"),
      speed: override.speed || "1 Gbps",
      vlan: override.vlan || "Access",
      connectedDevice: override.connectedDevice || "",
      connectedPort: override.connectedPort || "",
      description: override.description || "Available operational port",
      cable: override.cable || "Cat6A Copper",
      length: override.length || "3m",
      transceiver: override.transceiver || "RJ45"
    });
  }

  return ports;
}


/* ==========================================================
   SECTION 8 - Legacy Service Request Builder
   The following section preserves your previous RIV workflow.
   Fetch calls now use relative paths so Render works correctly.
   ========================================================== */

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
      <input id="sourceDevice" type="text" placeholder="e.g. EdgeSwitch-01" />
      <label><strong>Source Port</strong></label>
      <input id="sourcePort" type="text" placeholder="e.g. Eth1/7" />
      <label><strong>Destination Device</strong></label>
      <input id="destinationDevice" type="text" placeholder="e.g. AppServer-01" />
      <label><strong>Destination Port</strong></label>
      <input id="destinationPort" type="text" placeholder="e.g. NIC1" />
      <label><strong>Rack</strong></label>
      <input id="rack" type="text" placeholder="e.g. R42" />
      <label><strong>RU Source</strong></label>
      <input id="ruSource" type="text" placeholder="e.g. RU38" />
      <label><strong>RU Destination</strong></label>
      <input id="ruDestination" type="text" placeholder="e.g. RU18" />
    `,
    patch_cross_rack: `
      <label><strong>Source Device</strong></label>
      <input id="sourceDevice" type="text" placeholder="e.g. CORE-SW-01" />
      <label><strong>Source Port</strong></label>
      <input id="sourcePort" type="text" placeholder="e.g. Eth5" />
      <label><strong>Source Rack</strong></label>
      <input id="sourceRack" type="text" placeholder="e.g. R42" />
      <label><strong>Source RU</strong></label>
      <input id="ruSource" type="text" placeholder="e.g. RU39" />
      <label><strong>Destination Device</strong></label>
      <input id="destinationDevice" type="text" placeholder="e.g. DIST-SW-01" />
      <label><strong>Destination Port</strong></label>
      <input id="destinationPort" type="text" placeholder="e.g. Gi1/0/5" />
      <label><strong>Destination Rack</strong></label>
      <input id="destinationRack" type="text" placeholder="e.g. R42" />
      <label><strong>Destination RU</strong></label>
      <input id="ruDestination" type="text" placeholder="e.g. RU32" />
    `,
    patch_ohu: `
      <label><strong>Source Device</strong></label>
      <input id="sourceDevice" type="text" />
      <label><strong>Source Port</strong></label>
      <input id="sourcePort" type="text" />
      <label><strong>Rack</strong></label>
      <input id="rack" type="text" placeholder="e.g. R42" />
      <label><strong>RU Source</strong></label>
      <input id="ruSource" type="text" placeholder="e.g. RU38" />
      <label><strong>Overhead Unit</strong></label>
      <input id="ohu" type="text" placeholder="e.g. OH-Panel-A" />
      <label><strong>Destination Port / Panel Position</strong></label>
      <input id="destinationPort" type="text" placeholder="e.g. Port 12" />
    `,
    power_cycle: `
      <label><strong>Device</strong></label>
      <input id="device" type="text" placeholder="e.g. SRV-APP-01" />
      <label><strong>Rack</strong></label>
      <input id="rack" type="text" placeholder="e.g. R42" />
      <label><strong>Working With Engineer</strong></label>
      <input id="engineer" type="text" placeholder="e.g. Justin" />
    `,
    port_validation: `
      <label><strong>Device</strong></label>
      <input id="device" type="text" />
      <label><strong>Port(s)</strong></label>
      <input id="ports" type="text" placeholder="e.g. Eth5, Eth14" />
      <label><strong>Rack</strong></label>
      <input id="rack" type="text" />
      <label><strong>Expected State</strong></label>
      <input id="expectedState" type="text" placeholder="e.g. up/up" />
    `,
    redundant_connectivity: `
      <label><strong>Source Device</strong></label>
      <input id="sourceDevice" type="text" />
      <label><strong>Destination Device</strong></label>
      <input id="destinationDevice" type="text" />
      <label><strong>Source Rack</strong></label>
      <input id="sourceRack" type="text" />
      <label><strong>Destination Rack</strong></label>
      <input id="destinationRack" type="text" />
      <label><strong>Redundancy Type</strong></label>
      <input id="redundancyType" type="text" placeholder="e.g. A/B" />
    `,
    network_device_task: `
      <label><strong>Device</strong></label>
      <input id="device" type="text" />
      <label><strong>Task Details</strong></label>
      <input id="taskDetails" type="text" placeholder="e.g. verify uplink status" />
      <label><strong>Rack</strong></label>
      <input id="rack" type="text" />
    `,
    server_task: `
      <label><strong>Server Name</strong></label>
      <input id="device" type="text" />
      <label><strong>Task Details</strong></label>
      <input id="taskDetails" type="text" placeholder="e.g. check NIC connectivity" />
      <label><strong>Rack</strong></label>
      <input id="rack" type="text" />
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

analyzeBtn.addEventListener("click", async (event) => {
  event.preventDefault();

  const description = buildDescription(serviceType.value);
  generatedDescription.value = description;

  try {
    const response = await fetch("/run-demo", {
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

    if (!response.ok) {
      alert(data.error || "Backend returned an error.");
      return;
    }

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
