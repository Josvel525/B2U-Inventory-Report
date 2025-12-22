const PACK_SIZES = [1, 6, 12, 18, 24, 30, 32, 40];
const SMS_NUMBER = "15555551234"; // Set your target phone number here

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
 * RESTORED: Function to change the number of cans per case
 */
function changePackSize(index) {
  const current = products[index].pack;
  const input = prompt(`Change cans per case (Current: ${current}):`, current);
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
  if (!products.length) {
    el.innerHTML = `<div class="product loading">No products loaded.</div>`;
    return;
  }

  el.innerHTML = products.reduce((markup, p, i) => {
    if (p.completed) return markup;
    const totalUnits = (p.singles || 0) + (p.cases || 0) * (p.pack || 24);
    
    return markup + `
      <div class="product">
        <div class="rowTop">
          <div><strong>${p.name}</strong><br><span class="pill">${p.category}</span></div>
          <button class="secondary" onclick="completeProduct(${i})">Complete</button>
        </div>
        <div class="grid">
          <label><span>Singles</span><div class="stepper">
            <button class="stepperButton" onclick="changeCount(${i},'singles',-1)">-</button>
            <span>${p.singles}</span>
            <button class="stepperButton" onclick="changeCount(${i},'singles',1)">+</button>
          </div></label>
          <label>
            <span onclick="changePackSize(${i})" style="text-decoration:underline; color:#c2410c; cursor:pointer;">
              ${p.pack} Pack
            </span>
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
 * GENERATE PDF & TRIGGER SMS
 */
async function generateReport() {
  if (!products.length) return alert("No inventory data.");

  let grandTotal = 0;
  let rows = products.map(p => {
    const total = (p.singles || 0) + (p.cases || 0) * (p.pack || 24);
    grandTotal += total;
    return `<tr><td>${p.name}</td><td>${p.singles}</td><td>${p.cases}</td><td>${p.pack}</td><td>${total}</td></tr>`;
  }).join('');

  const printWindow = window.open('', '_blank');
  
  // Create clean HTML for the PDF
  const reportHTML = `
    <html>
      <head>
        <title>B2U Inventory Report</title>
        <style>
          body { font-family: -apple-system, sans-serif; padding: 20px; color: #1e293b; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
          th { background: #f97316; color: white; }
          h1 { color: #f97316; }
          .grand-total { margin-top: 20px; font-size: 1.25rem; font-weight: bold; border-top: 2px solid #f97316; padding-top: 10px; }
        </style>
      </head>
      <body>
        <h1>B2U Inventory Report</h1>
        <p>Date: ${new Date().toLocaleString()}</p>
        <table>
          <thead><tr><th>Item</th><th>Singles</th><th>Cases</th><th>Pack</th><th>Total</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="grand-total">Grand Total: ${grandTotal} Units</div>
        <script>
          window.onload = function() { 
            window.print(); 
            window.onafterprint = function() { window.close(); };
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(reportHTML);
  printWindow.document.close();

  // Wait for the print window to be handled before jumping to SMS
  setTimeout(() => {
    const smsBody = `B2U Inventory Complete. Grand Total: ${grandTotal} units. (PDF Report attached in next step)`;
    window.location.href = `sms:${SMS_NUMBER}&body=${encodeURIComponent(smsBody)}`;
  }, 2000);
}

async function ensureProductsLoaded() {
  const stored = localStorage.getItem("products");
  if (stored) {
    products = normalizeProducts(JSON.parse(stored));
  } else {
    try {
      const res = await fetch("inventory.json");
      const defaults = await res.json();
      products = normalizeProducts(defaults);
      save(false);
    } catch (e) { console.error("Could not load inventory.json", e); }
  }
}

ensureProductsLoaded().then(render);
