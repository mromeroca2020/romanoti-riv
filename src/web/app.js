const ticketNumber = document.getElementById("ticketNumber");
const shortDescription = document.getElementById("shortDescription");
const description = document.getElementById("description");
const runDemoBtn = document.getElementById("runDemoBtn");

const parsedOutput = document.getElementById("parsedOutput");
const reportOutput = document.getElementById("reportOutput");
const runbookOutput = document.getElementById("runbookOutput");
const closureOutput = document.getElementById("closureOutput");

runDemoBtn.addEventListener("click", async () => {
  try {
    const response = await fetch("http://127.0.0.1:5000/run-demo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ticket_number: ticketNumber.value,
        short_description: shortDescription.value,
        description: description.value
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
  const text = closureOutput.value;

  try {
    await navigator.clipboard.writeText(text);
    alert("Closure text copied.");
  } catch (error) {
    alert("Unable to copy closure text.");
    console.error(error);
  }
});