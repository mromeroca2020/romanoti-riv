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
   SECTION 1B - Demo connectivity paths

   Purpose:
   Defines visual multi-hop paths between devices, panels,
   MDF points, backbone segments and racks.
   ========================================================== */

const connectivityPaths = {
  "core-sw-01:14": {
    id: "PATH-0001",
    title: "CORE-SW-01 Eth14 to FW-01 Port 3",
    status: "warning",
    source: "CORE-SW-01 Eth14",
    destination: "FW-01 Port 3",
    cable: "Cat6A Copper",
    length: "2m",
    vlan: "20",
    speed: "1 Gbps",
    hops: [
      { type: "rack", name: "Rack R42", detail: "DemoDC-01 / source rack" },
      { type: "device", name: "CORE-SW-01", detail: "RU39 / Eth14" },
      { type: "oh", name: "OH-PANEL-A", detail: "Overhead panel / Port 12" },
      { type: "mdf", name: "MDF-A", detail: "Main distribution / Port 21" },
      { type: "backbone", name: "Backbone-01", detail: "LC-LC MM Fiber / 15m" },
      { type: "mdf", name: "MDF-B", detail: "Main distribution / Port 21" },
      { type: "oh", name: "OH-PANEL-B", detail: "Overhead panel / Port 07" },
      { type: "device", name: "FW-01", detail: "RU27 / Port 3" },
      { type: "rack", name: "Rack R42", detail: "DemoDC-01 / destination rack" }
    ]
  },

  "dist-sw-01:5": {
    id: "PATH-0002",
    title: "DIST-SW-01 Gi1/0/5 to CORE-SW-01 Eth5",
    status: "up",
    source: "DIST-SW-01 Gi1/0/5",
    destination: "CORE-SW-01 Eth5",
    cable: "Cat6A Copper",
    length: "3m",
    vlan: "10",
    speed: "1 Gbps",
    hops: [
      { type: "rack", name: "Rack R42", detail: "DemoDC-01 / source rack" },
      { type: "device", name: "DIST-SW-01", detail: "RU32 / Gi1/0/5" },
      { type: "patch", name: "In-Rack Patch", detail: "Copper patch / 3m" },
      { type: "device", name: "CORE-SW-01", detail: "RU39 / Eth5" },
      { type: "rack", name: "Rack R42", detail: "DemoDC-01 / destination rack" }
    ]
  }
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
/* ==========================================================
   Connectivity Map DOM references
   ========================================================== */

const connectivityTitle = document.getElementById("connectivityTitle");
const connectivityCanvas = document.getElementById("connectivityCanvas");
const connectionDetailTitle = document.getElementById("connectionDetailTitle");
const connectionDetailBody = document.getElementById("connectionDetailBody");
const fitConnectivityBtn = document.getElementById("fitConnectivityBtn");
const resetConnectivityBtn = document.getElementById("resetConnectivityBtn");
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

/*
  Connectivity Map state

  connectivityZoom:
  - Reserved for map zoom/fit behavior.
  - For now we keep the map at 100%, but the variable is ready for future controls.

  selectedConnectivityPathId:
  - Stores the currently selected visual path in the Connectivity Map.
  - This allows the map to keep a highlighted route while the user inspects details.
*/
let connectivityZoom = 1;
let selectedConnectivityPathId = null;


/* ==========================================================
   SECTION 3 - Initialization
   ========================================================== */

initCompanySelector();
attachRackEvents();

/*
  Connectivity Map initialization

  This prepares the visual map area before a rack is loaded.
  The map will render real demo paths once the user selects:
  Company → Data Center → Rack.
*/
attachConnectivityEvents();
renderConnectivityEmptyState();


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

  /*
    Default selection behavior:
    - When a rack is loaded, select the first device automatically.
    - Do not select a port yet.
    - This keeps the rack view useful immediately without forcing the user
      to click a device first.
  */
  selectedDeviceId = activeRack.devices[0]?.id || null;
  selectedPortKey = null;

  /*
    Render the core RIV views:
    1. Physical Rack View
    2. Rack metrics
    3. Device detail panel
    4. Connectivity Map
  */
  renderRack(activeRack);
  updateRackMetrics();
  updateDeviceDetail(getSelectedDevice());
  renderConnectivityMapForRack(activeRack);

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

  /*
    Keep Connectivity Map synchronized with the Rack View.

    When the user clicks:
    - a device: the map keeps showing all available paths for the rack.
    - a port with a documented path: the map highlights that path.
    - a port without a documented path: the map explains that no route exists yet.

    This is important because RIV should behave like one connected operational tool,
    not isolated panels.
  */
  renderConnectivityMapForRack(activeRack);
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
   SECTION 6B - Connectivity Map Renderer

   Purpose:
   - Render visual connectivity paths for the selected rack.
   - Show routes between rack, devices, OH panels, MDF points and backbone.
   - Highlight the path related to the selected port when available.
   - Display technical path details for future Smart Hands workflows.

   Design principle:
   - This is still frontend demo data.
   - Later, connectivityPaths should come from the backend/DCIM database.
   - For now, this gives RIV a real operational visualization layer.
   ========================================================== */


/*
  attachConnectivityEvents()

  Connects the Connectivity Map buttons and click delegation.
  This function is safe: it checks if DOM elements exist before attaching events.
*/
function attachConnectivityEvents() {
  injectConnectivityMapStyles();

  if (fitConnectivityBtn) {
    fitConnectivityBtn.addEventListener("click", () => {
      connectivityZoom = 1;
      renderConnectivityMapForRack(activeRack);
    });
  }

  if (resetConnectivityBtn) {
    resetConnectivityBtn.addEventListener("click", () => {
      selectedConnectivityPathId = null;
      renderConnectivityMapForRack(activeRack);
    });
  }

  if (connectivityCanvas) {
    connectivityCanvas.addEventListener("click", (event) => {
      const hopElement = event.target.closest("[data-connectivity-hop]");
      const pathElement = event.target.closest("[data-connectivity-path]");

      /*
        Hop click:
        Shows details for one specific point in the route,
        for example MDF-A, OH-PANEL-A or CORE-SW-01.
      */
      if (hopElement) {
        const pathId = hopElement.dataset.connectivityPathId;
        const hopIndex = Number(hopElement.dataset.connectivityHop);
        const path = getConnectivityPathsForActiveRack().find((item) => item.id === pathId);

        if (!path || Number.isNaN(hopIndex)) return;

        selectedConnectivityPathId = path.id;
        renderConnectivityMapForRack(activeRack, path.id);
        renderConnectivityHopDetail(path, path.hops[hopIndex], hopIndex);
        return;
      }

      /*
        Path click:
        Shows the full route details and highlights the selected path.
      */
      if (pathElement) {
        const pathId = pathElement.dataset.connectivityPath;
        const path = getConnectivityPathsForActiveRack().find((item) => item.id === pathId);

        if (!path) return;

        selectedConnectivityPathId = path.id;
        renderConnectivityMapForRack(activeRack, path.id);
        renderConnectivityPathDetail(path);
      }
    });
  }
}


/*
  renderConnectivityEmptyState()

  Displays a clean placeholder before the user loads a rack.
*/
function renderConnectivityEmptyState() {
  if (!connectivityCanvas) return;

  if (connectivityTitle) {
    connectivityTitle.textContent = "Connectivity Map";
  }

  connectivityCanvas.innerHTML = `
    <div class="connectivity-empty-state">
      <div class="connectivity-empty-icon">RIV</div>
      <h3>No rack loaded yet</h3>
      <p>
        Select a company, data center and rack to generate the visual
        connectivity map.
      </p>
    </div>
  `;

  if (connectionDetailTitle) {
    connectionDetailTitle.textContent = "Connection Details";
  }

  if (connectionDetailBody) {
    connectionDetailBody.innerHTML = `
      <p class="connection-muted">
        No connectivity path selected yet.
      </p>
    `;
  }
}


/*
  renderConnectivityMapForRack()

  Main renderer for the Connectivity Map.

  Behavior:
  - If no rack is selected, show empty state.
  - If a rack is selected, show all known paths for that rack.
  - If the selected port has a documented path, highlight it.
  - If the selected port has no documented path, explain that this route
    still needs to be modeled.
*/
function renderConnectivityMapForRack(rack, focusPathId = null) {
  if (!connectivityCanvas) return;

  injectConnectivityMapStyles();

  if (!rack) {
    renderConnectivityEmptyState();
    return;
  }

  const paths = getConnectivityPathsForActiveRack();
  const selectedPortPath = getConnectivityPathForSelectedPort();

  /*
    Determine what path should be highlighted.

    Priority:
    1. Explicit focus path passed by a click.
    2. Path matching selected device/port.
    3. Previous selected path.
    4. First available path.
  */
  let effectivePathId = focusPathId;

  if (!effectivePathId && selectedPortPath) {
    effectivePathId = selectedPortPath.id;
  }

  if (!effectivePathId && selectedConnectivityPathId) {
    const stillExists = paths.some((path) => path.id === selectedConnectivityPathId);
    effectivePathId = stillExists ? selectedConnectivityPathId : null;
  }

  if (!effectivePathId && !selectedPortKey && paths.length > 0) {
    effectivePathId = paths[0].id;
  }

  selectedConnectivityPathId = effectivePathId;

  if (connectivityTitle) {
    connectivityTitle.textContent = `${activeDatacenter?.name || "Data Center"} / ${rack.name} Connectivity`;
  }

  if (paths.length === 0) {
    connectivityCanvas.innerHTML = `
      <div class="connectivity-empty-state">
        <div class="connectivity-empty-icon">MAP</div>
        <h3>No documented paths for this rack</h3>
        <p>
          This rack is loaded, but no MDF/OH/device paths have been modeled yet.
        </p>
      </div>
    `;

    renderConnectivityNoPathDetail();
    return;
  }

  const stats = buildConnectivityMapStats(paths);

  connectivityCanvas.innerHTML = `
    <div class="connectivity-map-shell">
      <div class="connectivity-map-header">
        <div>
          <span class="connectivity-eyebrow">Romanoti RIV · Connectivity Map</span>
          <h3>${escapeHtml(rack.name)} Route Model</h3>
          <p>
            Visual path from devices to rack, overhead panels, MDF points and backbone segments.
          </p>
        </div>

        <div class="connectivity-health ${stats.warning > 0 ? "warning" : "healthy"}">
          ${stats.warning > 0 ? "Review Required" : "Healthy"}
        </div>
      </div>

      <div class="connectivity-stats">
        <div>
          <strong>${paths.length}</strong>
          <span>Known Paths</span>
        </div>
        <div>
          <strong>${stats.up}</strong>
          <span>Operational</span>
        </div>
        <div>
          <strong>${stats.warning}</strong>
          <span>Need Review</span>
        </div>
        <div>
          <strong>${countUniqueConnectivityHops(paths)}</strong>
          <span>Map Nodes</span>
        </div>
      </div>

      <div class="connectivity-legend">
        <span><i class="legend-node rack"></i>Rack</span>
        <span><i class="legend-node device"></i>Device</span>
        <span><i class="legend-node oh"></i>OH</span>
        <span><i class="legend-node mdf"></i>MDF</span>
        <span><i class="legend-node backbone"></i>Backbone</span>
        <span><i class="legend-status warning"></i>Needs Review</span>
      </div>

      <div class="connectivity-map-viewport" style="--connectivity-zoom: ${connectivityZoom};">
        ${paths.map((path) => renderConnectivityPathLane(path, effectivePathId)).join("")}
      </div>
    </div>
  `;

  /*
    Update detail panel after rendering the map.
    If the user selected a port without a known path, show a clear message.
  */
  if (selectedPortKey && !selectedPortPath) {
    renderConnectivitySelectedPortWithoutPath();
    return;
  }

  const selectedPath = paths.find((path) => path.id === effectivePathId);

  if (selectedPath) {
    renderConnectivityPathDetail(selectedPath);
  } else {
    renderConnectivityDefaultDetail(paths);
  }
}


/*
  renderConnectivityPathLane()

  Renders one visual horizontal route.

  Each route is a multi-hop sequence:
  Rack → Device → OH → MDF → Backbone → MDF → OH → Device → Rack
*/
function renderConnectivityPathLane(path, selectedPathId) {
  const statusClass = getConnectivityStatusClass(path.status);
  const isSelected = path.id === selectedPathId;

  return `
    <div
      class="connectivity-path-lane ${statusClass} ${isSelected ? "selected" : ""}"
      data-connectivity-path="${escapeHtml(path.id)}"
      role="button"
      tabindex="0"
      title="${escapeHtml(path.title)}"
    >
      <div class="connectivity-path-top">
        <div>
          <strong>${escapeHtml(path.title)}</strong>
          <span>${escapeHtml(path.source)} → ${escapeHtml(path.destination)}</span>
        </div>

        <em class="${statusClass}">
          ${getConnectivityStatusLabel(path.status)}
        </em>
      </div>

      <div class="connectivity-hop-row">
        ${path.hops.map((hop, index) => renderConnectivityHop(path, hop, index)).join("")}
      </div>

      <div class="connectivity-path-meta">
        <span>Cable: <strong>${escapeHtml(path.cable)}</strong></span>
        <span>Length: <strong>${escapeHtml(path.length)}</strong></span>
        <span>Speed: <strong>${escapeHtml(path.speed)}</strong></span>
        <span>VLAN: <strong>${escapeHtml(path.vlan)}</strong></span>
      </div>
    </div>
  `;
}


/*
  renderConnectivityHop()

  Renders one hop/node in the visual path.
*/
function renderConnectivityHop(path, hop, index) {
  const isLast = index === path.hops.length - 1;

  return `
    <button
      type="button"
      class="connectivity-hop ${escapeHtml(hop.type)}"
      data-connectivity-path-id="${escapeHtml(path.id)}"
      data-connectivity-hop="${index}"
      title="${escapeHtml(hop.name)} - ${escapeHtml(hop.detail)}"
    >
      <span>${getConnectivityHopIcon(hop.type)}</span>
      <strong>${escapeHtml(hop.name)}</strong>
      <small>${escapeHtml(hop.detail)}</small>
    </button>

    ${isLast ? "" : `<div class="connectivity-arrow">→</div>`}
  `;
}


/*
  renderConnectivityPathDetail()

  Shows technical details for the selected full path.
*/
function renderConnectivityPathDetail(path) {
  if (!connectionDetailTitle || !connectionDetailBody) return;

  const statusClass = getConnectivityStatusClass(path.status);

  connectionDetailTitle.textContent = path.title;

  connectionDetailBody.innerHTML = `
    <div class="connection-detail-card">
      <div class="connection-detail-status ${statusClass}">
        ${getConnectivityStatusLabel(path.status)}
      </div>

      <div class="detail-row">
        <span>Path ID</span>
        <strong>${escapeHtml(path.id)}</strong>
      </div>

      <div class="detail-row">
        <span>Source</span>
        <strong>${escapeHtml(path.source)}</strong>
      </div>

      <div class="detail-row">
        <span>Destination</span>
        <strong>${escapeHtml(path.destination)}</strong>
      </div>

      <div class="detail-row">
        <span>Cable / Length</span>
        <strong>${escapeHtml(path.cable)} • ${escapeHtml(path.length)}</strong>
      </div>

      <div class="detail-row">
        <span>Speed / VLAN</span>
        <strong>${escapeHtml(path.speed)} • VLAN ${escapeHtml(path.vlan)}</strong>
      </div>

      <div class="connection-route-list">
        <strong>Route Hops</strong>
        <ol>
          ${path.hops.map((hop) => `
            <li>
              <span>${escapeHtml(hop.name)}</span>
              <small>${escapeHtml(hop.detail)}</small>
            </li>
          `).join("")}
        </ol>
      </div>

      <div class="smart-hands-note">
        <strong>Smart Hands readiness</strong>
        <p>
          ${
            path.status === "warning"
              ? "This path must be validated before dispatching a Smart Hands task."
              : "This path is ready to be converted into guided Smart Hands instructions."
          }
        </p>
      </div>
    </div>
  `;
}


/*
  renderConnectivityHopDetail()

  Shows detail for one selected hop inside a path.
*/
function renderConnectivityHopDetail(path, hop, index) {
  if (!connectionDetailTitle || !connectionDetailBody) return;

  connectionDetailTitle.textContent = `${hop.name} / Hop ${index + 1}`;

  connectionDetailBody.innerHTML = `
    <div class="connection-detail-card">
      <div class="connection-detail-status ${getConnectivityStatusClass(path.status)}">
        ${getConnectivityStatusLabel(path.status)}
      </div>

      <div class="detail-row">
        <span>Related Path</span>
        <strong>${escapeHtml(path.title)}</strong>
      </div>

      <div class="detail-row">
        <span>Hop Type</span>
        <strong>${escapeHtml(hop.type.toUpperCase())}</strong>
      </div>

      <div class="detail-row">
        <span>Hop Name</span>
        <strong>${escapeHtml(hop.name)}</strong>
      </div>

      <div class="detail-row">
        <span>Technical Detail</span>
        <strong>${escapeHtml(hop.detail)}</strong>
      </div>

      <div class="smart-hands-note">
        <strong>Field instruction value</strong>
        <p>
          This hop can later become an individual Smart Hands checklist step
          with validation, notes and photo evidence.
        </p>
      </div>
    </div>
  `;
}


/*
  renderConnectivityDefaultDetail()

  Used when there is no specific selected path yet.
*/
function renderConnectivityDefaultDetail(paths) {
  if (!connectionDetailTitle || !connectionDetailBody) return;

  connectionDetailTitle.textContent = "Connection Details";

  connectionDetailBody.innerHTML = `
    <p class="connection-muted">
      Select a path or a route node to inspect details.
    </p>

    <div class="connection-route-list">
      <strong>Available paths</strong>
      <ol>
        ${paths.map((path) => `
          <li>
            <span>${escapeHtml(path.title)}</span>
            <small>${escapeHtml(path.source)} → ${escapeHtml(path.destination)}</small>
          </li>
        `).join("")}
      </ol>
    </div>
  `;
}


/*
  renderConnectivityNoPathDetail()

  Used when the selected rack has no modeled connectivity.
*/
function renderConnectivityNoPathDetail() {
  if (!connectionDetailTitle || !connectionDetailBody) return;

  connectionDetailTitle.textContent = "No Connectivity Model";

  connectionDetailBody.innerHTML = `
    <p class="connection-muted">
      This rack does not have documented MDF/OH/device paths yet.
    </p>

    <div class="smart-hands-note">
      <strong>Next DCIM step</strong>
      <p>
        Add connection records for devices, ports, panels, backbone and destination endpoints.
      </p>
    </div>
  `;
}


/*
  renderConnectivitySelectedPortWithoutPath()

  Used when the user clicks a port that exists, but no route exists yet
  in connectivityPaths.
*/
function renderConnectivitySelectedPortWithoutPath() {
  if (!connectionDetailTitle || !connectionDetailBody) return;

  const device = getSelectedDevice();
  const port = getSelectedPort();

  connectionDetailTitle.textContent = "No Path Recorded";

  connectionDetailBody.innerHTML = `
    <p class="connection-muted">
      The selected port exists, but RIV does not have a documented connectivity path for it yet.
    </p>

    <div class="detail-row">
      <span>Selected Port</span>
      <strong>${escapeHtml(device?.name || "Unknown Device")} / ${escapeHtml(port?.name || "Unknown Port")}</strong>
    </div>

    <div class="smart-hands-note">
      <strong>Recommended modeling action</strong>
      <p>
        Create a path record using the key:
        <strong>${escapeHtml(selectedDeviceId || "device-id")}:${escapeHtml(selectedPortKey || "port-key")}</strong>
        inside <strong>connectivityPaths</strong>.
      </p>
    </div>
  `;
}


/*
  getConnectivityPathsForActiveRack()

  Filters connectivityPaths to show only paths related to the active rack.
  For now, it matches using device names present in the rack.
*/
function getConnectivityPathsForActiveRack() {
  if (!activeRack) return [];

  const rackDeviceNames = new Set(activeRack.devices.map((device) => device.name));

  return Object.values(connectivityPaths).filter((path) => {
    return path.hops.some((hop) => rackDeviceNames.has(hop.name));
  });
}


/*
  getConnectivityPathForSelectedPort()

  Finds the path directly associated with the selected device/port.
  Example:
  selectedDeviceId = "core-sw-01"
  selectedPortKey = "14"
  lookup key = "core-sw-01:14"
*/
function getConnectivityPathForSelectedPort() {
  if (!selectedDeviceId || !selectedPortKey) return null;

  const pathKey = `${selectedDeviceId}:${selectedPortKey}`;
  return connectivityPaths[pathKey] || null;
}


/*
  buildConnectivityMapStats()

  Produces summary values for the visual map header.
*/
function buildConnectivityMapStats(paths) {
  return paths.reduce((summary, path) => {
    const statusClass = getConnectivityStatusClass(path.status);

    if (statusClass === "warning") {
      summary.warning += 1;
    } else if (statusClass === "up") {
      summary.up += 1;
    } else {
      summary.other += 1;
    }

    return summary;
  }, {
    up: 0,
    warning: 0,
    other: 0
  });
}


/*
  countUniqueConnectivityHops()

  Counts unique visual nodes across all paths.
*/
function countUniqueConnectivityHops(paths) {
  const unique = new Set();

  paths.forEach((path) => {
    path.hops.forEach((hop) => {
      unique.add(`${hop.type}:${hop.name}`);
    });
  });

  return unique.size;
}


/*
  getConnectivityStatusClass()

  Normalizes path statuses into CSS-friendly names.
*/
function getConnectivityStatusClass(status) {
  if (status === "warning") return "warning";
  if (status === "critical") return "critical";
  if (status === "down" || status === "offline") return "offline";
  return "up";
}


/*
  getConnectivityStatusLabel()

  Human-readable status labels.
*/
function getConnectivityStatusLabel(status) {
  if (status === "warning") return "Needs Review";
  if (status === "critical") return "Critical";
  if (status === "down" || status === "offline") return "Offline";
  return "Operational";
}


/*
  getConnectivityHopIcon()

  Short labels used inside visual hop nodes.
*/
function getConnectivityHopIcon(type) {
  const icons = {
    rack: "RACK",
    device: "DEV",
    oh: "OH",
    mdf: "MDF",
    backbone: "BB",
    patch: "PATCH"
  };

  return icons[type] || "NODE";
}


/*
  escapeHtml()

  Protects the UI from accidental HTML injection when rendering strings.
  Even though current data is demo/local, this is important for future backend data.
*/
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/*
  injectConnectivityMapStyles()

  Temporary frontend-only styling for Connectivity Map.

  Why injected here?
  - So we can move fast without editing another file right now.
  - Later, these styles should be moved into src/web/styles.css
    under a formal Romanoti Platform design standard section.
*/
function injectConnectivityMapStyles() {
  if (document.getElementById("riv-connectivity-map-styles")) return;

  const style = document.createElement("style");
  style.id = "riv-connectivity-map-styles";

  style.textContent = `
    .connectivity-empty-state {
      min-height: 360px;
      border: 1px dashed rgba(201, 178, 126, 0.35);
      border-radius: 22px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 32px;
      background:
        radial-gradient(circle at top left, rgba(201, 178, 126, 0.13), transparent 30%),
        rgba(255, 255, 255, 0.035);
      color: rgba(255, 255, 255, 0.78);
    }

    .connectivity-empty-icon {
      width: 64px;
      height: 64px;
      border-radius: 20px;
      display: grid;
      place-items: center;
      margin-bottom: 16px;
      background: rgba(201, 178, 126, 0.18);
      color: #f3dfad;
      font-weight: 900;
      letter-spacing: 0.08em;
    }

    .connectivity-empty-state h3 {
      margin: 0 0 8px;
      color: #ffffff;
    }

    .connectivity-empty-state p {
      max-width: 520px;
      margin: 0;
      line-height: 1.6;
    }

    .connectivity-map-shell {
      border-radius: 24px;
      padding: 20px;
      background:
        radial-gradient(circle at 15% 10%, rgba(125, 211, 252, 0.10), transparent 30%),
        radial-gradient(circle at 85% 70%, rgba(201, 178, 126, 0.12), transparent 32%),
        rgba(7, 12, 21, 0.72);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #f8fafc;
    }

    .connectivity-map-header {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .connectivity-eyebrow {
      display: block;
      color: #c9b27e;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 11px;
      font-weight: 800;
      margin-bottom: 6px;
    }

    .connectivity-map-header h3 {
      margin: 0 0 6px;
      font-size: 22px;
      color: #ffffff;
    }

    .connectivity-map-header p {
      margin: 0;
      color: rgba(248, 250, 252, 0.68);
      line-height: 1.55;
    }

    .connectivity-health {
      padding: 9px 13px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 900;
      white-space: nowrap;
    }

    .connectivity-health.healthy {
      color: #dcfce7;
      background: rgba(34, 197, 94, 0.16);
      border: 1px solid rgba(34, 197, 94, 0.35);
    }

    .connectivity-health.warning {
      color: #fff3bf;
      background: rgba(255, 209, 102, 0.16);
      border: 1px solid rgba(255, 209, 102, 0.35);
    }

    .connectivity-stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(120px, 1fr));
      gap: 12px;
      margin-bottom: 14px;
    }

    .connectivity-stats div {
      padding: 13px 14px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .connectivity-stats strong {
      display: block;
      color: #ffffff;
      font-size: 24px;
      line-height: 1;
      margin-bottom: 5px;
    }

    .connectivity-stats span {
      color: rgba(248, 250, 252, 0.68);
      font-size: 12px;
      font-weight: 700;
    }

    .connectivity-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 16px;
      color: rgba(248, 250, 252, 0.76);
      font-size: 12px;
      font-weight: 700;
    }

    .connectivity-legend span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.055);
    }

    .legend-node,
    .legend-status {
      width: 11px;
      height: 11px;
      border-radius: 999px;
      display: inline-block;
    }

    .legend-node.rack { background: #cbd5e1; }
    .legend-node.device { background: #c084fc; }
    .legend-node.oh { background: #7dd3fc; }
    .legend-node.mdf { background: #c9b27e; }
    .legend-node.backbone { background: #38bdf8; }
    .legend-status.warning { background: #ffd166; }

    .connectivity-map-viewport {
      transform: scale(var(--connectivity-zoom));
      transform-origin: top left;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .connectivity-path-lane {
      border-radius: 20px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.055);
      border: 1px solid rgba(255, 255, 255, 0.08);
      cursor: pointer;
      transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease,
        transform 0.2s ease,
        background 0.2s ease;
    }

    .connectivity-path-lane:hover,
    .connectivity-path-lane.selected {
      transform: translateY(-1px);
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(201, 178, 126, 0.50);
      box-shadow: 0 16px 38px rgba(0, 0, 0, 0.22);
    }

    .connectivity-path-lane.warning {
      border-color: rgba(255, 209, 102, 0.28);
    }

    .connectivity-path-lane.warning.selected {
      border-color: rgba(255, 209, 102, 0.75);
      box-shadow: 0 0 0 1px rgba(255, 209, 102, 0.28), 0 16px 38px rgba(0, 0, 0, 0.22);
    }

    .connectivity-path-top {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: flex-start;
      margin-bottom: 14px;
    }

    .connectivity-path-top strong {
      display: block;
      color: #ffffff;
      margin-bottom: 4px;
    }

    .connectivity-path-top span {
      color: rgba(248, 250, 252, 0.66);
      font-size: 13px;
    }

    .connectivity-path-top em {
      font-style: normal;
      padding: 7px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 900;
      white-space: nowrap;
    }

    .connectivity-path-top em.up {
      color: #dcfce7;
      background: rgba(34, 197, 94, 0.16);
      border: 1px solid rgba(34, 197, 94, 0.32);
    }

    .connectivity-path-top em.warning {
      color: #fff3bf;
      background: rgba(255, 209, 102, 0.16);
      border: 1px solid rgba(255, 209, 102, 0.32);
    }

    .connectivity-hop-row {
      display: flex;
      align-items: stretch;
      gap: 8px;
      overflow-x: auto;
      padding: 8px 2px 12px;
    }

    .connectivity-hop {
      min-width: 132px;
      max-width: 160px;
      border: none;
      border-radius: 16px;
      padding: 11px 10px;
      color: #ffffff;
      text-align: left;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.10);
      transition: transform 0.18s ease, border-color 0.18s ease;
    }

    .connectivity-hop:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.28);
    }

    .connectivity-hop span {
      display: inline-flex;
      padding: 4px 7px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 900;
      margin-bottom: 7px;
      background: rgba(255, 255, 255, 0.10);
    }

    .connectivity-hop strong {
      display: block;
      font-size: 13px;
      margin-bottom: 5px;
    }

    .connectivity-hop small {
      display: block;
      color: rgba(248, 250, 252, 0.68);
      line-height: 1.35;
    }

    .connectivity-hop.rack {
      background: rgba(148, 163, 184, 0.16);
      border-color: rgba(203, 213, 225, 0.30);
    }

    .connectivity-hop.device {
      background: rgba(192, 132, 252, 0.15);
      border-color: rgba(192, 132, 252, 0.32);
    }

    .connectivity-hop.oh {
      background: rgba(125, 211, 252, 0.14);
      border-color: rgba(125, 211, 252, 0.32);
    }

    .connectivity-hop.mdf {
      background: rgba(201, 178, 126, 0.16);
      border-color: rgba(201, 178, 126, 0.34);
    }

    .connectivity-hop.backbone {
      background: rgba(56, 189, 248, 0.13);
      border-color: rgba(56, 189, 248, 0.32);
    }

    .connectivity-hop.patch {
      background: rgba(34, 197, 94, 0.13);
      border-color: rgba(34, 197, 94, 0.28);
    }

    .connectivity-arrow {
      display: flex;
      align-items: center;
      color: rgba(248, 250, 252, 0.55);
      font-size: 22px;
      font-weight: 900;
      padding: 0 2px;
      user-select: none;
    }

    .connectivity-path-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 4px;
      color: rgba(248, 250, 252, 0.70);
      font-size: 12px;
    }

    .connectivity-path-meta span {
      padding: 7px 9px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.055);
    }

    .connectivity-path-meta strong {
      color: #ffffff;
    }

    .connection-muted {
      color: rgba(248, 250, 252, 0.70);
      line-height: 1.55;
    }

    .connection-detail-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .connection-detail-status {
      display: inline-flex;
      width: fit-content;
      padding: 7px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 900;
    }

    .connection-detail-status.up {
      color: #dcfce7;
      background: rgba(34, 197, 94, 0.16);
      border: 1px solid rgba(34, 197, 94, 0.32);
    }

    .connection-detail-status.warning {
      color: #fff3bf;
      background: rgba(255, 209, 102, 0.16);
      border: 1px solid rgba(255, 209, 102, 0.32);
    }

    .connection-route-list {
      padding-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .connection-route-list > strong {
      display: block;
      color: #f3dfad;
      margin-bottom: 8px;
    }

    .connection-route-list ol {
      margin: 0;
      padding-left: 20px;
    }

    .connection-route-list li {
      margin-bottom: 8px;
      color: rgba(248, 250, 252, 0.82);
    }

    .connection-route-list li span {
      display: block;
      font-weight: 800;
      color: #ffffff;
    }

    .connection-route-list li small {
      display: block;
      color: rgba(248, 250, 252, 0.62);
      margin-top: 2px;
    }

    .smart-hands-note {
      padding: 12px;
      border-radius: 16px;
      background: rgba(201, 178, 126, 0.10);
      border: 1px solid rgba(201, 178, 126, 0.22);
    }

    .smart-hands-note strong {
      display: block;
      color: #f3dfad;
      margin-bottom: 6px;
    }

    .smart-hands-note p {
      margin: 0;
      color: rgba(248, 250, 252, 0.76);
      line-height: 1.55;
    }

    @media (max-width: 900px) {
      .connectivity-map-header,
      .connectivity-path-top {
        flex-direction: column;
      }

      .connectivity-stats {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 560px) {
      .connectivity-stats {
        grid-template-columns: 1fr;
      }

      .connectivity-map-shell {
        padding: 14px;
      }
    }
  `;

  document.head.appendChild(style);
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
