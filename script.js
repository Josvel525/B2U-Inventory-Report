const PACK_SIZES = [1, 6, 12, 18, 24, 30, 32, 40];
const SMS_NUMBER = "15555551234"; // Change to your actual number
const FORMSPREE_URL = "https://formspree.io/f/xqezggkz"; 

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

function resetInventory() {
  if (confirm("Reset all counts to zero?")) {
    products.forEach(p => {
      p.singles = 0; p.cases = 0; p.completed = false;
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
 * AUTO-EMAIL VIA FORMSPREE + SMS
 */
async function generateReport() {
  if (!products.length) return alert("No data.");

  let grandTotal = 0;
  // Create a plain text version for the email body
  let emailContent = "B2U Shift Report\n------------------\n";
  
  products.forEach(p => {
    const total = (p.singles || 0) + (p.cases || 0) * (p.pack || 24);
    grandTotal += total;
    emailContent += `${p.name}: ${p.singles} Singles, ${p.cases} Cases (${p.pack}pk) | Total: ${total}\n`;
  });

  emailContent += `\nGRAND TOTAL UNITS: ${grandTotal}`;

  // 1. SEND THE EMAIL (Hidden from user)
  try {
    fetch(FORMSPREE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: `New B2U Inventory Report - ${grandTotal} Units`,
        message: emailContent
      })
    });
    alert("Report sent to email!");
  } catch (err) {
    console.error("Email failed", err);
  }

  // 2. TRIGGER SMS
  setTimeout(() => {
    const bodyText = encodeURIComponent(`B2U Inventory Summary: ${grandTotal} units. (Email sent)`);
    window.location.href = `sms:${SMS_NUMBER}&body=${bodyText}`;
  }, 1000);
}

async function ensureProductsLoaded() {
  const stored = localStorage.getItem("products");
  const storedData = stored ? JSON.parse(stored) : [];
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
