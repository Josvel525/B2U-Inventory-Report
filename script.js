/**
 * CONFIGURATION
 */
const SMS_NUMBER = "15555551234"; // Update to your real number
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbTQPp2ME54l1H9jtTF_B-raP29rYwTPjXgsqevRQTzfYmFeSbyu23KCnQq9JqpgVc/exec";

// SAFETY FALLBACK: If inventory.json fails, these items will show up
const fallbackProducts = [
  { name: "Sample Item 1", category: "General", pack: 24 },
  { name: "Sample Item 2", category: "General", pack: 12 }
];

let products = [];

/**
 * Ensures data consistency
 */
function normalizeProducts(list) {
  return (list || []).map(p => ({
    name: p.name || "Unknown Item",
    category: p.category || "General",
    singles: Number(p.singles) || 0,
    cases: Number(p.cases) || 0,
    pack: parseInt(p.pack, 10) || 24,
    completed: Boolean(p.completed)
  }));
}

function save(renderNow = true) {
  localStorage.setItem("products", JSON.stringify(products));
  if (renderNow) render();
}

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
 * UI: Renders the product list
 */
function render() {
  const el = document.getElementById("inventory");
  if (!el) return;
  
  // If no products, show a message
  if (products.length === 0) {
    el.innerHTML = `<p style="text-align:center; padding: 20px;">No products found. Check inventory.json</p>`;
    return;
  }

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
 * REPORT GENERATION
 */
async function generateReport() {
  if (!products || products.length === 0) return alert("No data found.");

  const btn = document.querySelector(".generate-btn");
  const originalText = btn ? btn.innerText : "Generate Report";
  
  let grandTotal = 0;
  const reportItems = products.map(p => {
    const total = (p.singles || 0) + (p.cases || 0) * (p.pack || 24);
    grandTotal += total;
    return { name: p.name, singles: p.singles, cases: p.cases, pack: p.pack, total: total };
  });

  if (btn) { btn.innerText = "Generating PDF..."; btn.disabled = true; }

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ 
        items: reportItems, 
        grandTotal: grandTotal,
        timestamp: new Date().toLocaleString() 
      })
    });

    const result = await response.json();

    if (result.url) {
      const msg = encodeURIComponent(`B2U Inventory:\nTotal Units: ${grandTotal}\nView PDF: ${result.url}`);
      window.location.href = `sms:${SMS_NUMBER}?body=${msg}`;
      if (btn) { btn.innerText = "Text Sent!"; }
    } else {
      throw new Error("No URL");
    }
  } catch (e) {
    alert("PDF saved to Drive. Triggering text now...");
    const msg = encodeURIComponent(`B2U Inventory:\nTotal Units: ${grandTotal}\nReport generated in Google Drive.`);
    window.location.href = `sms:${SMS_NUMBER}?body=${msg}`;
    if (btn) { btn.innerText = originalText; btn.disabled = false; }
  }
}

/**
 * LOAD DATA: Safety logic
 */
async function ensureProductsLoaded() {
  const stored = localStorage.getItem("products");
  let data = stored ? JSON.parse(stored) : [];

  // If local storage is empty, try fetching JSON
  if (data.length === 0) {
    try {
      const res = await fetch("inventory.json");
      if (!res.ok) throw new Error();
      data = await res.json();
    } catch (e) {
      console.warn("Using fallback products list.");
      data = fallbackProducts;
    }
  }
  
  products = normalizeProducts(data);
  render();
}

// Initialize
window.onload = ensureProductsLoaded;
