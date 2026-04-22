document.getElementById("runDemoBtn").addEventListener("click", async () => {
  const ticket = document.getElementById("ticketInput").value;

  try {
    const response = await fetch("http://127.0.0.1:5000/run-demo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ticket: ticket })
    });

    const data = await response.json();

    // Report
    document.getElementById("reportOutput").textContent = data.report;

    // Closure
    document.getElementById("closureOutput").value = data.closure;

    // Runbook
    const runbookList = document.getElementById("runbookOutput");
    runbookList.innerHTML = "";

    data.runbook.forEach((step, index) => {
      const li = document.createElement("li");
      li.textContent = step;
      runbookList.appendChild(li);
    });

  } catch (error) {
    console.error(error);
    alert("Error connecting to backend");
  }
});

document.getElementById("copyClosureBtn").addEventListener("click", async () => {
  const text = document.getElementById("closureOutput").value;
  await navigator.clipboard.writeText(text);
  alert("Closure text copied.");
});