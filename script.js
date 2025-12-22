const PACK_SIZES = [1, 6, 12, 18, 24, 30, 32, 40];
const SMS_NUMBER = "15555551234"; // IMPORTANT: Change this to your real number

let products = [];

function normalizeProducts(list) {
  return (list || []).map(p => ({
    ...p,
    singles: Number.isFinite(p.singles) ? p.singles : 0,
    cases: Number.isFinite(p.cases) ? p.cases : 0,
    pack: parseInt(p.pack, 10) || 24,
    completed: Boolean(p.completed)
  }));
}

function save(renderNow = true) {
  localStorage.setItem("products", JSON.stringify(products));
  if (renderNow) render();
}

/**
 * RESET: Clear counts for the shift
 */
function resetInventory() {
  if (confirm("Reset all counts to zero?")) {
    products.forEach(p => {
      p.singles = 0;
      p.cases = 0;
      p.completed = false;
    });
    save();
  }
}

function changePackSize(index) {
  const current = products[index].pack;
  const input = prompt(`Cans per case:`, current);
  if (input !== null) {
    const newSize = parseInt(input, 10);
    if (!isNaN(newSize) && newSize > 0) {
      products[index].pack = newSize;
      save();
    }
  }
}

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
        <div class="total">Total: ${totalUnits}</div>
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
 * REPORT: Generate PDF table and trigger iPhone SMS
 */
async function generateReport() {
  if (!products.length) return alert("No inventory found.");

  let grandTotal = 0;
  let rows = products.map(p => {
    const total = (p.singles || 0) + (p.cases || 0) * (p.pack || 24);
    grandTotal += total;
    return `<tr>
      <td style="text-align:left;">${p.name}</td>
      <td>${p.singles}</td>
      <td>${p.cases}</td>
      <td>${p.pack}</td>
      <td style="font-weight:bold;">${total}</td>
    </tr>`;
  }).join('');

  const reportHTML = `
    <html>
      <head>
        <style>
          body { font-family: -apple-system, sans-serif; padding: 20px; color: #000; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ccc; padding: 10px; text-align: center; font-size: 14px; }
          th { background: #111; color: white; text-transform: uppercase; }
          h1 { color: #f97316; margin-bottom: 5px; }
          .grand-total { margin-top: 20px; font-size: 18px; font-weight: bold; text-align: right; }
        </style>
      </head>
      <body>
        <h1>B2U Inventory Report</h1>
        <p>Date: ${new Date().toLocaleDateString()}</p>
        <table>
          <thead><tr><th style="text-align:left;">Item</th><th>S</th><th>C</th><th>P</th><th>Total</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="grand-total">Grand Total: ${grandTotal} Units</div>
        <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };</script>
      </body>
    </html>`;

  const win = window.open('', '_blank');
  win.document.write(reportHTML);
  win.document.close();

  // Trigger SMS Summary
  setTimeout(() => {
    const bodyText = encodeURIComponent(`B2U Inventory Summary: ${grandTotal} total units. (PDF Report attached separately)`);
    // &body works for iPhone SMS links with numbers
    window.location.href = `sms:${SMS_NUMBER}&body=${bodyText}`;
  }, 2500);
}

/**
 * STARTUP: Load master list from JSON if the app is empty
 */
async function ensureProductsLoaded() {
  const stored = localStorage.getItem("products");
  const storedData = stored ? JSON.parse(stored) : [];

  // If memory is empty or missing items, pull the 29-item list from JSON
  if (storedData.length < 10) {
    try {
      const res = await fetch("inventory.json");
      const defaults = await res.json();
      products = normalizeProducts(defaults);
      save(false);
    } catch (e) { products = normalizeProducts(storedData); }
  } else {
    products = normalizeProducts(storedData);
  }
}

ensureProductsLoaded().then(render);
