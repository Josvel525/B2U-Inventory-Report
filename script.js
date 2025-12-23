/**
 * CONFIGURATION
 */
const PACK_SIZES = [1, 6, 12, 18, 24, 30, 32, 40];
const SMS_NUMBER = "15555551234"; // Update to your actual recipient number
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbTQPp2ME54l1H9jtTF_B-raP29rYwTPjXgsqevRQTzfYmFeSbyu23KCnQq9JqpgVc/exec";

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
 * REPORT GENERATION
 * Optimized for iPhone: Sends data, waits for PDF link, then opens SMS.
 */
async function generateReport() {
  if (!products || products.length === 0) return alert("No data found.");

  // Target the report button for UI feedback
  const btn = document.querySelector(".generate-btn");
  const originalText = btn ? btn.innerText : "Generate Report";
  
  let grandTotal = 0;
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

  if (btn) {
    btn.innerText = "Generating PDF...";
    btn.disabled = true;
  }

  try {
    // 1. Send data to Google Script
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ 
        items: reportItems, 
        grandTotal: grandTotal,
        timestamp: new Date().toLocaleString() 
      })
    });

    // 2. Get the link from the response
    const result = await response.json();

    if (result.url) {
      const shareLink = result.url;
      const msg = encodeURIComponent(`B2U Inventory Summary:\nTotal Units: ${grandTotal}\nView PDF Report: ${shareLink}`);
      
      // 3. Trigger SMS (Auto-prompt)
      window.location.href = `sms:${SMS_NUMBER}?body=${msg}`;

      // 4. Update button as a fallback manual trigger
      if (btn) {
        btn.innerText = "Send Text Manually";
        btn.disabled = false;
        btn.onclick = () => { window.location.href = `sms:${SMS_NUMBER}?body=${msg}`; };
      }
    } else {
      throw new Error("No URL returned from Google.");
    }

  } catch (e) {
    console.error("Report Error:", e);
    alert("The report was saved to Drive, but there was an issue opening the text message automatically.");
    if (btn) {
      btn.innerText = originalText;
      btn.disabled = false;
    }
  }
}

/**
 * LOAD DATA: Fetches inventory.json if local storage is empty
 */
async function ensureProductsLoaded() {
  const stored = localStorage.getItem("products");
  const storedData = stored ? JSON.parse(stored) : [];

  if (storedData.length < 5) {
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

// Start app
ensureProductsLoaded().then(render);
