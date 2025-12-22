const PACK_SIZES = [1, 6, 12, 18, 24, 30, 32, 40];
const SMS_NUMBER = "15555551234"; // Update this to your real number

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
          <button class="secondary" onclick="completeProduct(${i})">Complete</button>
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

async function generateReport() {
  if (!products.length) return alert("No data.");

  let grandTotal = 0;
  let rows = products.map(p => {
    const total = (p.singles || 0) + (p.cases || 0) * (p.pack || 24);
    grandTotal += total;
    return `<tr><td>${p.name}</td><td>${p.singles}</td><td>${p.cases}</td><td>${p.pack}</td><td>${total}</td></tr>`;
  }).join('');

  const reportHTML = `
    <html>
      <head><style>
        body { font-family: sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background: #f97316; color: white; }
      </style></head>
      <body>
        <h1>B2U Inventory Report</h1>
        <table><thead><tr><th>Item</th><th>S</th><th>C</th><th>P</th><th>Total</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <p><strong>Grand Total: ${grandTotal}</strong></p>
        <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };</script>
      </body>
    </html>`;

  const win = window.open('', '_blank');
  win.document.write(reportHTML);
  win.document.close();

  setTimeout(() => {
    window.location.href = `sms:${SMS_NUMBER}&body=Inventory Complete. Total: ${grandTotal}. PDF created.`;
  }, 2000);
}

// THE FIX: If there are 4 or fewer items, it forces a reload from inventory.json
async function ensureProductsLoaded() {
  const stored = localStorage.getItem("products");
  const storedData = stored ? JSON.parse(stored) : [];

  if (storedData.length <= 4) {
    try {
      const res = await fetch("inventory.json");
      const defaults = await res.json();
      products = normalizeProducts(defaults);
      save(false);
    } catch (e) {
      console.error("Fetch failed, using stored data", e);
      products = normalizeProducts(storedData);
    }
  } else {
    products = normalizeProducts(storedData);
  }
}

ensureProductsLoaded().then(render);
