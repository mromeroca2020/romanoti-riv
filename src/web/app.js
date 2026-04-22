function generateReport() {
  return `=== RIV Verification Report ===
Total checks: 3
Passed: 3
Failed: 0

[OK] Device Power Cycle - Power cycle executed successfully on rack H10
[OK] Link Status - Link/activity lights are active
[OK] Service Access - User confirmed login and access`;
}

function generateClosure() {
  return `Controlled power cycle was performed on the requested device in rack H10. Device NOMT10TS03B is confirmed operational after verification checks. Stakeholder Faizan has been informed. Issue resolved.`;
}

document.getElementById("runDemoBtn").addEventListener("click", () => {
  document.getElementById("reportOutput").textContent = generateReport();
  document.getElementById("closureOutput").value = generateClosure();
});

document.getElementById("copyClosureBtn").addEventListener("click", async () => {
  const text = document.getElementById("closureOutput").value;
  try {
    await navigator.clipboard.writeText(text);
    alert("Closure text copied.");
  } catch (error) {
    alert("Unable to copy closure text.");
  }
});