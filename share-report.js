// share-report.js
// iOS Share Sheet + Email CSV support (client-side only)

const REPORT_FILENAME = "bartending-inventory-report.csv";

function buildCSV(products) {
  let rows = [
    ["Item", "Category", "Singles", "Cases", "Pack", "Total Units"]
  ];

  let grandTotal = 0;

  products.forEach(p => {
    const singles = Number(p.singles || 0);
    const cases = Number(p.cases || 0);
    const pack = Number(p.pack || 24);
    const total = singles + cases * pack;
    grandTotal += total;

    rows.push([
      p.name,
      p.category,
      singles,
      cases,
      pack,
      total
    ]);
  });

  rows.push([]);
  rows.push(["Grand Total", "", "", "", "", grandTotal]);

  const csv = rows
    .map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return { pdf, grandTotal };
}

function createCSVBlob(csv) {
  return new Blob([csv], { type: "text/csv;charset=utf-8;" });
}

function downloadCSV(blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = REPORT_FILENAME;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function sharePDF(blob, grandTotal) {
  if (!navigator.share) {
    alert("Share not supported on this device.");
    return;
  }

  const file = new File([blob], REPORT_FILENAME, { type: "text/pdf" });

  try {
    await navigator.share({
      title: "End of Night Inventory Report",
      text: `Total Units: ${grandTotal}`,
      files: [file]
    });
  } catch (err) {
    console.warn("Share cancelled", err);
  }
}

function emailCSV(csv, grandTotal) {
  const subject = "End of Night Inventory Report";
  const body =
    `Inventory complete.\n\n` +
    `Total Units: ${grandTotal}\n\n` +
    `CSV file is attached separately if supported.\n\n` +
    `If attachment is not included, please download the CSV from the app.`;

  window.location.href =
    `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function generateAndShareReport(products) {
  if (!products || !products.length) {
    alert("No inventory data found.");
    return;
  }

  const { csv, grandTotal } = buildCSV(products);
  const blob = createCSVBlob(csv);

  // Always download first (guaranteed)
  downloadCSV(blob);

  // Try iOS Share Sheet
  shareCSV(blob, grandTotal);

  // Fallback email option
  emailCSV(csv, grandTotal);
}