const PACK_SIZES = [1, 6, 12, 18, 24, 30, 32, 40];
const SMS_NUMBER = "15555551234"; // Update this to your real number
const FORMSPREE_URL = "https://formspree.io/f/xqezggkz"; 

let products = [];

/**
 * Ensures data consistency for calculations
 */
function normalizeProducts(list) {
  return (list || []).map(p => ({
    ...p,
    singles: Number.isFinite(p.singles) ? p.singles : 0,
    cases: Number.isFinite(p.cases) ? p.cases : 0,
    pack: parseInt(p.pack, 10) || 24,
    completed: Boolean(p.completed)
  }));
}

/**
 * Saves current state to iPhone memory and refreshes the UI
 */
function save(renderNow = true) {
  localStorage.setItem("products", JSON.stringify(products));
  if (renderNow) render();
}

/**
 * RESET: Clears all counts for a new shift
 */
function resetInventory() {
  if (confirm("Reset all counts to zero for a new shift?")) {
    products.forEach(p => {
      p.singles = 0;
      p.cases = 0;
      p.completed = false;
    });
    save();
  }
}

/**
 * UI: Changes the number of cans per case
 */
function changePackSize(index) {
  const current = products[index].pack;
  const input = prompt(`Enter cans per case:`, current);
  if (input !== null) {
    const newSize = parseInt(input, 10);
    if (!isNaN(newSize) && newSize > 0) {
      products[index].pack = newSize;
      save();
    }
  }
}

/**
 * UI: Renders the product list to the screen
 */
function render() {
  const el = document.getElementById("inventory");
  if (!el) return;
  el.innerHTML = products.reduce((markup, p, i) => {
    if (p.completed) return markup;
    const totalUnits = (p.singles || 0) + (p.cases || 0) * (p.pack || 24);
    return markup + `
      <div class="product">
        <div class="rowTop">
          <div><strong>${p.name}</strong><br><span class="pill">${p.category}</span></div>
          <button class="secondary" onclick="completeProduct(${i})">Done</button>
        </div>
        <div class="grid">
          <label><span>Singles</span><div class="stepper">
            <button class="stepperButton" onclick="changeCount(${i},'singles',-1)">-</button>
            <span>${p.singles}</span>
            <button class="stepperButton" onclick="changeCount(${i},'singles',1)">+</button>
          </div></label>
          <label><span onclick="changePackSize(${i})" style="text-decoration:underline;color:#c2410c;">${p.pack} Pack</span>
            <div class="stepper">
              <button class="stepperButton" onclick="changeCount(${i},'cases',-1)">-</button>
              <span>${p.cases}</span>
              <button class="stepperButton" onclick="changeCount(${i},'cases',1)">+</button>
            </div>
          </label>
        </div>
        <div class="total">Total: ${totalUnits} units</div>
      </div>`;
  }, "");
}

function changeCount(index, field, delta) {
  products[index][field] = Math.max(0, (products[index][field] || 0) + delta);
  save();
}

function completeProduct(index) {
  products[index].completed = true;
  save();
}

/**
 * REPORT: Sends Email, Opens PDF, and Triggers SMS
 */
async function generateReport() {
  if (!products.length) return alert("No data found.");

  let grandTotal = 0;
  let tableBody = "";
  
  // Build data for Email and PDF
  products.forEach(p => {
    const total = (p.singles || 0) + (p.cases || 0) * (p.pack || 24);
    grandTotal += total;
    tableBody += `
      <tr>
        <td style="border:1px solid #ccc; padding:8px; text-align:left;">${p.name}</td>
        <td style="border:1px solid #ccc; padding:8px; text-align:center;">${p.singles}</td>
        <td style="border:1px solid #ccc; padding:8px; text-align:center;">${p.cases}</td>
        <td style="border:1px solid #ccc; padding:8px; text-align:center;">${p.pack}</td>
        <td style="border:1px solid #ccc; padding:8px; text-align:center; font-weight:bold;">${total}</td>
      </tr>`;
  });

  // 1. SEND EMAIL via Formspree (HTML Format)
  const emailBody = `
    <h2>B2U Inventory Report</h2>
    <p>Date: ${new Date().toLocaleString()}</p>
    <table style="width:100%; border-collapse:collapse; font-family:sans-serif;">
      <thead><tr style="background:#111; color:#fff;"><th>Item</th><th>S</th><th>C</th><th>P</th><th>Total</th></tr></thead>
      <tbody>${tableBody}</tbody>
    </table>
    <h3>Grand Total: ${grandTotal} Units</h3>
  `;

  try {
    fetch(FORMSPREE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ message: emailBody, _subject: "B2U Shift Report" })
    });
    alert("Report sent to email!");
  } catch (e) { console.error("Email error", e); }

  // 2. OPEN PDF PRINT WINDOW
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 10px; text-align: center; }
          th { background: #eee; }
          h1 { color: #f97316; }
        </style>
      </head>
      <body>
        <h1>B2U Shift Report</h1>
        <table>
          <thead><tr><th>Item</th><th>Singles</th><th>Cases</th><th>Pack</th><th>Total</th></tr></thead>
          <tbody>${tableBody}</tbody>
        </table>
        <h2>Grand Total: ${grandTotal} Units</h2>
        <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };</script>
      </body>
    </html>
  `);
  printWindow.document.close();

  // 3. TRIGGER SMS SUMMARY
  setTimeout(() => {
    const msg = encodeURIComponent(`B2U Inventory Complete: ${grandTotal} total units. (Email Sent)`);
    window.location.href = `sms:${SMS_NUMBER}&body=${msg}`;
  }, 2500);
}

/**
 * LOAD DATA: Fetches inventory.json if memory is empty
 */
async function ensureProductsLoaded() {
  const stored = localStorage.getItem("products");
  const storedData = stored ? JSON.parse(stored) : [];

  // If memory has fewer than 10 items, force load the full 29-item list
  if (storedData.length < 10) {
    try {
      const res = await fetch("inventory.json");
      const defaults = await res.json();
      products = normalizeProducts(defaults);
      save(false);
    } catch (e) {
      products = normalizeProducts(storedData);
    }
  } else {
    products = normalizeProducts(storedData);
  }
}

// Start the app
ensureProductsLoaded().then(render);
