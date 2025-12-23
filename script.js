/**
 * CONFIGURATION
 */
const PACK_SIZES = [1, 6, 12, 18, 24, 30, 32, 40];
const SMS_NUMBER = "15555551234"; // Update this to your real number
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzhFBIoPtI34rbLnlQTb1ZUNGCvW9yUAPwzHK5iCPC1yHPgiEd1syfy44Y13qhW7zg/exec";

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
 * Saves current state to device memory and refreshes the UI
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
 * REPORT: Sends Data to Google Script & Triggers SMS
 */
async function generateReport() {
  if (!products || products.length === 0) return alert("No data found.");

  let grandTotal = 0;
  // Prepare data for Google
  const reportItems = products.map(p => {
    const total = (p.singles || 0) + (p.cases || 0) * (p.pack || 24);
    grandTotal += total;
    return {
      name: p.name,
      singles: p.singles,
      cases: p.cases,
      pack: p.pack,
      total: total
    };
  });

  alert("Uploading report to Google... Please wait.");

  try {
    // 1. POST to Google Apps Script
    // Using 'no-cors' mode for Google Web Apps compatibility
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        items: reportItems, 
        grandTotal: grandTotal,
        timestamp: new Date().toLocaleString() 
      })
    });

    // 2. Trigger SMS Summary
    // Opens the native SMS app with the data pre-filled
    setTimeout(() => {
      const msg = encodeURIComponent(`B2U Inventory Summary:\nTotal Units: ${grandTotal}\nFull PDF Report has been generated and saved to Drive.`);
      window.location.href = `sms:${SMS_NUMBER}?body=${msg}`;
    }, 1200);

  } catch (e) {
    console.error("Report Error:", e);
    alert("Error communicating with Google Script. Check your connection.");
  }
}

/**
 * LOAD DATA: Fetches inventory.json if memory is empty
 */
async function ensureProductsLoaded() {
  const stored = localStorage.getItem("products");
  const storedData = stored ? JSON.parse(stored) : [];

  // Logic to refresh data if empty or outdated
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

// Initialize the app
ensureProductsLoaded().then(render);
