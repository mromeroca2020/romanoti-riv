# Runbook: Power Cycle – Network Device

## 1. Purpose

This runbook describes the standard procedure to perform a controlled power cycle on a network device within a data center environment.

The goal is to safely restart the device while minimizing risk and ensuring proper verification after the action.

---

## 2. Scope

This procedure applies to:

- network devices (switches, firewalls, terminal servers)
- devices with single or dual power supplies
- remote or on-site (smart hands) operations

---

## 3. Preconditions

Before performing the power cycle, ensure:

- the correct device has been identified (hostname / label / rack position)
- the request has been authorized (ticket or engineer confirmation)
- potential impact has been evaluated
- communication with stakeholders is active

---

## 4. Procedure

### Step 1 – Identify the device

- confirm rack location (example: H10)
- confirm device name (example: NOMT10TS03B)
- visually verify labels and connections

---

### Step 2 – Verify current state

- check link/activity lights
- confirm device appears unresponsive or requires restart
- ensure no active critical operation is ongoing

---

### Step 3 – Perform power cycle

#### Single power supply

1. disconnect power cable
2. wait 10–15 seconds
3. reconnect power cable

---

#### Dual power supply (recommended method)

1. disconnect power supply A
2. wait 10–15 seconds
3. reconnect power supply A

4. disconnect power supply B
5. wait 10–15 seconds
6. reconnect power supply B

---

### Step 4 – Observe device recovery

- verify LEDs turn on
- confirm link/activity lights are present
- listen for normal hardware activity (fans, etc.)

---

### Step 5 – Validate service

- confirm device is reachable
- validate network connectivity if applicable
- obtain confirmation from user or engineer

---

## 5. Verification Criteria

The operation is considered successful if:

- device powers on correctly
- link/activity indicators are active
- service access is restored
- stakeholder confirms functionality

---

## 6. Expected Output (RIV Integration)

RIV should generate:

### Verification Report

- total checks
- pass/fail status
- detailed messages per check

---

### Closure Text Example
